from django.db import models

from accounts.models import Pharmacy
from billing.models import Bill


class IncomingOrder(models.Model):
    """A prepaid home-delivery order placed on the customer-facing portal,
    received via the /api/auth/integration/receive-order/ webhook (see
    orders.views.ReceiveOrderView). Payment has already cleared there
    before this row is ever created -- accept()/reject() just decide
    whether the pharmacy will fulfill it, not whether it gets paid for.
    """

    STATUS_CHOICES = [
        ("placed", "Placed"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("out_for_delivery", "Out for delivery"),
        ("delivered", "Delivered"),
    ]

    customer_order_id = models.UUIDField(unique=True, db_index=True)
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name="incoming_orders")

    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    delivery_address = models.TextField()

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="placed")

    bill = models.ForeignKey(Bill, on_delete=models.SET_NULL, null=True, blank=True, related_name="incoming_order")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.customer_order_id} ({self.status}) @ {self.pharmacy.name}"


class IncomingOrderItem(models.Model):
    incoming_order = models.ForeignKey(IncomingOrder, on_delete=models.CASCADE, related_name="items")
    medicine_name = models.CharField(max_length=255)
    salt_name = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.medicine_name} x {self.quantity}"
