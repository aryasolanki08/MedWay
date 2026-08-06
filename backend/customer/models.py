import secrets
import uuid

from django.conf import settings
from django.db import models

from catalog.models import Medicine
from pharmacies.models import MedicineStock


def generate_pickup_code():
    # Short, easy to read aloud/type at a pharmacy counter -- not a security
    # token, just a human-friendly claim reference.
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I ambiguity
    return "".join(secrets.choice(alphabet) for _ in range(6))


class SearchHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="search_history")
    query = models.CharField(max_length=255)
    searched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-searched_at"]


class SavedMedicine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_medicines")
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "medicine")
        ordering = ["-saved_at"]


class Reservation(models.Model):
    """A customer's claim on stock at one pharmacy, picked up in person.
    This app only reads MedicineStock (owned by the pharmacy-side portal),
    so a reservation provisionally decrements quantity here on the read
    replica; a real deployment would push this to the pharmacy portal via
    the sync endpoint mentioned in the README instead of writing directly.
    """

    STATUS_CHOICES = [
        ("pending", "Pending pickup"),
        ("picked_up", "Picked up"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    stock = models.ForeignKey(MedicineStock, on_delete=models.CASCADE, related_name="reservations")
    quantity = models.PositiveIntegerField(default=1)
    reserved_price = models.DecimalField(max_digits=10, decimal_places=2)
    pickup_code = models.CharField(max_length=8, unique=True, default=generate_pickup_code, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
