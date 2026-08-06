import secrets

from django.db import models
from django.contrib.auth.models import User

class Pharmacy(models.Model):
    name = models.CharField(max_length=255)
    license_number = models.CharField(max_length=100)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    email = models.EmailField()

    # Structured location -- mirrors backend.pharmacies.Pharmacy.city/
    # state/area on the customer portal (see accounts.locations for valid
    # areas), collected at signup so the customer portal can filter search
    # by area instead of only GPS radius.
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True, db_index=True)

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_pharmacies')
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('solo', 'Solo Starter'),
            ('smart', 'Smart Pharmacy'),
            ('clinic', 'Clinic Network'),
        ],
        default='solo'
    )
    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class StaffUser(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('staff', 'Staff'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='staff_members')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='staff')

    # Set only for accounts created/linked via "Sign in with Google". We key
    # off this (Google's stable per-user subject id), not email, since email
    # can be reassigned; django.contrib.auth.User can't carry this field
    # directly (it's not swapped out here), so it lives on the one-to-one
    # profile every logged-in account already has.
    google_sub = models.CharField(max_length=255, blank=True, null=True, unique=True, db_index=True)

    def __str__(self):
        return f"{self.user.username} ({self.role} @ {self.pharmacy.name})"


def generate_api_key():
    """A random, URL-safe API key. 64 hex chars ~= 256 bits of entropy."""
    return secrets.token_hex(32)


class APIKey(models.Model):
    """API keys used by trusted external systems (e.g. the customer-facing
    portal) to push data into this pharmacy portal via the /integration/
    endpoints. Keys are not tied to a single pharmacy -- they are used for
    bulk data registration, so any pharmacy/medicine data included in a
    request is created/updated as-is.
    """
    key = models.CharField(max_length=64, unique=True, default=generate_api_key, editable=False)
    name = models.CharField(max_length=255, default='Integration Key')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.key[:8]}...)"
