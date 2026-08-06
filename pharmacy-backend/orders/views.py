import logging

import requests
from django.conf import settings
from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Pharmacy, StaffUser
from accounts.permissions import HasPharmacy, HasValidAPIKey, PharmacyScopeMixin
from billing.models import Bill, BillItem
from inventory.models import Medicine

from .models import IncomingOrder, IncomingOrderItem
from .serializers import IncomingOrderSerializer

logger = logging.getLogger(__name__)


class ReceiveOrderView(APIView):
    """Webhook receiver for prepaid orders from the customer-facing
    portal, called once payment has already cleared there (see that
    portal's orders.views._notify_pharmacy). Authenticated the same way
    as the existing register-data/export-data integration endpoints.
    """
    permission_classes = [HasValidAPIKey]

    def post(self, request, *args, **kwargs):
        data = request.data
        pharmacy_id = data.get("pharmacy_id")
        order_id = data.get("order_id")
        items = data.get("items") or []

        if not pharmacy_id or not order_id or not items:
            return Response({"detail": "pharmacy_id, order_id and items are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pharmacy = Pharmacy.objects.get(pk=pharmacy_id)
        except Pharmacy.DoesNotExist:
            return Response({"detail": f"No pharmacy with id {pharmacy_id} on this portal."}, status=status.HTTP_404_NOT_FOUND)

        if IncomingOrder.objects.filter(customer_order_id=order_id).exists():
            return Response({"detail": "Order already received."}, status=status.HTTP_200_OK)

        with transaction.atomic():
            incoming = IncomingOrder.objects.create(
                customer_order_id=order_id,
                pharmacy=pharmacy,
                customer_name=data.get("customer_name", ""),
                customer_phone=data.get("customer_phone", ""),
                delivery_address=data.get("delivery_address", ""),
                total_amount=data.get("total_amount") or 0,
            )
            IncomingOrderItem.objects.bulk_create([
                IncomingOrderItem(
                    incoming_order=incoming,
                    medicine_name=item.get("name", ""),
                    salt_name=item.get("salt_composition", ""),
                    quantity=item.get("quantity", 1),
                    unit_price=item.get("unit_price") or 0,
                )
                for item in items
            ])

        return Response(IncomingOrderSerializer(incoming).data, status=status.HTTP_201_CREATED)


class IncomingOrderViewSet(PharmacyScopeMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = IncomingOrderSerializer
    permission_classes = [permissions.IsAuthenticated, HasPharmacy]
    queryset = IncomingOrder.objects.all().prefetch_related("items")

    def _transition(self, request, pk, from_statuses, to_status):
        order = self.get_object()
        if order.status not in from_statuses:
            return None, Response(
                {"detail": f"Order is '{order.status}', can't move to '{to_status}' from here."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = to_status
        order.save(update_fields=["status", "updated_at"])
        return order, None

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        order = self.get_object()
        if order.status != "placed":
            return Response({"detail": f"Order is '{order.status}', can't accept."}, status=status.HTTP_400_BAD_REQUEST)

        pharmacy = order.pharmacy
        created_by = None
        try:
            created_by = request.user.staff_profile
        except StaffUser.DoesNotExist:
            pass

        with transaction.atomic():
            bill = Bill.objects.create(
                pharmacy=pharmacy,
                customer_name=order.customer_name,
                customer_phone=order.customer_phone,
                total_amount=order.total_amount,
                created_by=created_by,
            )
            for item in order.items.all():
                # Best-effort match to a real inventory line by name -- the
                # customer portal's catalog and this portal's inventory
                # aren't the same rows, so this can legitimately miss (e.g.
                # a medicine renamed on one side). Decrement what we can
                # match; still bill for the full order either way, since
                # payment already cleared for what the customer ordered.
                medicine = Medicine.objects.filter(pharmacy=pharmacy, name=item.medicine_name).first()
                if medicine:
                    if medicine.stock_quantity >= item.quantity:
                        medicine.stock_quantity -= item.quantity
                        medicine.save(update_fields=["stock_quantity"])
                    else:
                        logger.warning(
                            "Order %s: insufficient stock for %s (have %s, need %s) -- billing anyway.",
                            order.customer_order_id, item.medicine_name, medicine.stock_quantity, item.quantity,
                        )
                    BillItem.objects.create(
                        bill=bill,
                        medicine=medicine,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        subtotal=item.unit_price * item.quantity,
                    )

            order.status = "accepted"
            order.bill = bill
            order.save(update_fields=["status", "bill", "updated_at"])

        _notify_customer(order)
        return Response(IncomingOrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        order, error = self._transition(request, pk, ["placed"], "rejected")
        if error:
            return error
        _notify_customer(order)
        return Response(IncomingOrderSerializer(order).data)

    @action(detail=True, methods=["post"], url_path="out-for-delivery")
    def out_for_delivery(self, request, pk=None):
        order, error = self._transition(request, pk, ["accepted"], "out_for_delivery")
        if error:
            return error
        _notify_customer(order)
        return Response(IncomingOrderSerializer(order).data)

    @action(detail=True, methods=["post"], url_path="mark-delivered")
    def mark_delivered(self, request, pk=None):
        order, error = self._transition(request, pk, ["out_for_delivery"], "delivered")
        if error:
            return error
        _notify_customer(order)
        return Response(IncomingOrderSerializer(order).data)


def _notify_customer(order):
    """Best-effort webhook back to the customer portal so the buyer sees
    status changes without polling. A failure here doesn't roll back the
    status change on this side -- the pharmacy's own view of the order is
    still authoritative and correct either way."""
    if not settings.CUSTOMER_API_KEY:
        logger.warning("CUSTOMER_API_KEY not set -- skipping status webhook for order %s", order.customer_order_id)
        return

    url = f"{settings.CUSTOMER_API_BASE_URL.rstrip('/')}/api/customer/orders/integration/status-update/"
    try:
        response = requests.post(
            url,
            json={"order_id": str(order.customer_order_id), "status": order.status},
            headers={"X-API-Key": settings.CUSTOMER_API_KEY},
            timeout=15,
        )
        response.raise_for_status()
    except requests.RequestException:
        logger.exception("Failed to notify customer portal of order %s status change", order.customer_order_id)
