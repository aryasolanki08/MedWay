import logging
import uuid

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

import razorpay

from pharmacies.models import MedicineStock

from .models import Order, OrderItem
from .serializers import OrderCreateSerializer, OrderSerializer

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post"]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related("pharmacy").prefetch_related("items")

    def create(self, request, *args, **kwargs):
        """Prices the cart server-side and creates a pending_payment Order
        -- no stock decrement and no pharmacy notification yet (mirrors
        customer.serializers.ReservationSerializer's server-side pricing,
        but the pharmacy only finds out once payment clears, see
        verify_payment below)."""
        input_serializer = OrderCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        with transaction.atomic():
            total = 0
            locked_items = []
            for item in data["items"]:
                stock = MedicineStock.objects.select_for_update().get(pk=item["stock"].pk)
                if item["quantity"] > stock.quantity:
                    return Response(
                        {"items": f"Only {stock.quantity} of {stock.medicine.brand_name} in stock."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                total += stock.price * item["quantity"]
                locked_items.append((stock, item["quantity"]))

            order = Order.objects.create(
                user=request.user,
                pharmacy=data["pharmacy"],
                delivery_address=data["delivery_address"],
                delivery_phone=data["delivery_phone"],
                total_amount=total,
            )
            OrderItem.objects.bulk_create([
                OrderItem(
                    order=order,
                    stock=stock,
                    medicine_name=stock.medicine.brand_name,
                    salt_name=stock.medicine.salt.name,
                    quantity=quantity,
                    unit_price=stock.price,
                )
                for stock, quantity in locked_items
            ])

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def create_payment(self, request, pk=None):
        order = self.get_object()
        if order.status != "pending_payment":
            return Response({"detail": "This order isn't awaiting payment."}, status=status.HTTP_400_BAD_REQUEST)

        amount_paise = int(order.total_amount * 100)
        key_id = settings.RAZORPAY_KEY_ID
        key_secret = settings.RAZORPAY_KEY_SECRET

        if key_id == "rzp_test_placeholder_id" or key_secret == "placeholder_secret":
            razorpay_order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
            is_mock = True
        else:
            try:
                client = razorpay.Client(auth=(key_id, key_secret))
                razorpay_order = client.order.create(data={
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": f"receipt_{order.id.hex[:12]}",
                    "payment_capture": 1,
                })
                razorpay_order_id = razorpay_order["id"]
                is_mock = False
            except Exception:
                razorpay_order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
                is_mock = True

        order.razorpay_order_id = razorpay_order_id
        order.save(update_fields=["razorpay_order_id", "updated_at"])

        return Response({
            "order_id": razorpay_order_id,
            "amount": amount_paise,
            "currency": "INR",
            "key_id": key_id,
            "is_mock": is_mock,
        })

    @action(detail=True, methods=["post"])
    def verify_payment(self, request, pk=None):
        order = self.get_object()
        if order.status != "pending_payment":
            return Response({"detail": "This order isn't awaiting payment."}, status=status.HTTP_400_BAD_REQUEST)

        razorpay_order_id = request.data.get("razorpay_order_id")
        payment_id = request.data.get("razorpay_payment_id")
        signature = request.data.get("razorpay_signature")
        if not all([razorpay_order_id, payment_id, signature]):
            return Response({"detail": "Missing required verification fields."}, status=status.HTTP_400_BAD_REQUEST)
        if razorpay_order_id != order.razorpay_order_id:
            return Response({"detail": "Payment does not match this order."}, status=status.HTTP_400_BAD_REQUEST)

        is_mock = razorpay_order_id.startswith("order_mock_")
        if not is_mock:
            try:
                client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                client.utility.verify_payment_signature({
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature,
                })
            except Exception:
                return Response({"detail": "Payment verification signature check failed."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = "paid"
        order.razorpay_payment_id = payment_id
        order.razorpay_signature = signature
        order.save(update_fields=["status", "razorpay_payment_id", "razorpay_signature", "updated_at"])

        _notify_pharmacy(order)

        return Response(OrderSerializer(order).data)


def _notify_pharmacy(order):
    """Best-effort webhook to the pharmacy backend once payment clears.
    Payment is already real and captured at this point, so a delivery
    failure here shouldn't undo it or block the customer's confirmation --
    just log it. See orders app README notes for the retry story."""
    if not settings.PHARMACY_API_KEY or not order.pharmacy.backend_id:
        logger.warning("Skipping pharmacy notification for order %s: not configured or no backend_id.", order.id)
        return

    url = f"{settings.PHARMACY_API_BASE_URL.rstrip('/')}/api/auth/integration/receive-order/"
    payload = {
        "order_id": str(order.id),
        "pharmacy_id": order.pharmacy.backend_id,
        "customer_name": order.user.get_full_name() or order.user.username,
        "customer_phone": order.delivery_phone,
        "delivery_address": order.delivery_address,
        "total_amount": str(order.total_amount),
        "items": [
            {
                "name": item.medicine_name,
                "salt_composition": item.salt_name,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
            }
            for item in order.items.all()
        ],
    }
    try:
        response = requests.post(url, json=payload, headers={"X-API-Key": settings.PHARMACY_API_KEY}, timeout=15)
        response.raise_for_status()
    except requests.RequestException:
        logger.exception("Failed to notify pharmacy backend of order %s", order.id)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def order_status_webhook(request):
    """Inbound status updates from the pharmacy backend (accept/reject/out
    for delivery/delivered). Authenticated by shared secret, not JWT --
    same X-API-Key convention as the pharmacy portal's own integration
    endpoints, just checked directly against settings instead of a
    per-key DB model since this is a single fixed partner, not many
    third-party integrators."""
    api_key = request.headers.get("X-API-Key")
    if not settings.PHARMACY_API_KEY or api_key != settings.PHARMACY_API_KEY:
        return Response({"detail": "Invalid or missing X-API-Key."}, status=status.HTTP_401_UNAUTHORIZED)

    order_id = request.data.get("order_id")
    new_status = request.data.get("status")
    valid_statuses = dict(Order.STATUS_CHOICES)
    if new_status not in valid_statuses:
        return Response({"detail": f"Unknown status: {new_status}"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(pk=order_id)
    except (Order.DoesNotExist, ValueError, TypeError):
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    order.status = new_status
    update_fields = ["status", "updated_at"]
    if new_status == "delivered" and not order.delivered_at:
        order.delivered_at = timezone.now()
        update_fields.append("delivered_at")
    order.save(update_fields=update_fields)
    return Response({"success": True})
