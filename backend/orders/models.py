import uuid

from django.conf import settings
from django.db import models

from pharmacies.models import MedicineStock, Pharmacy


class Order(models.Model):
    """A prepaid home-delivery order from one pharmacy, replacing the
    pickup-only Reservation flow for the customer-facing UI (Reservation
    itself is left intact -- see customer.models.Reservation).

    Created as pending_payment with no stock decrement; only once
    payment is verified (status -> paid) is the pharmacy notified, via a
    webhook to its /api/auth/integration/receive-order/ endpoint (see
    orders.views.OrderViewSet.verify_payment). Stock is decremented and a
    real billing.Bill is created on the PHARMACY side when it accepts,
    not here -- this DB only ever holds the customer's view of the order.
    """

    STATUS_CHOICES = [
        ("pending_payment", "Pending payment"),
        ("paid", "Paid"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("out_for_delivery", "Out for delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.PROTECT, related_name="orders")

    delivery_address = models.TextField()
    delivery_phone = models.CharField(max_length=20)

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending_payment")

    # Set once, the moment the pharmacy marks it delivered (see
    # orders.views.order_status_webhook) -- distinct from updated_at,
    # which changes on every status transition, so insights can report
    # real "spent on delivered orders" figures scoped to when delivery
    # actually happened, not just the last time the row changed.
    delivered_at = models.DateTimeField(null=True, blank=True)

    razorpay_order_id = models.CharField(max_length=255, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True)
    razorpay_signature = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.id} ({self.status}) @ {self.pharmacy.name}"


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    stock = models.ForeignKey(MedicineStock, on_delete=models.PROTECT, related_name="order_items")

    # Snapshots, not live FKs to catalog.Medicine/Salt -- the pharmacy-side
    # portal matches incoming order lines by name (see plan), and prices
    # must reflect what was actually charged even if the catalog changes.
    medicine_name = models.CharField(max_length=255)
    salt_name = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.medicine_name} x {self.quantity}"
