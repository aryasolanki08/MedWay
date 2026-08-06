import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from catalog.models import Medicine


class Pharmacy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=500, blank=True)
    lat = models.FloatField()
    lng = models.FloatField()
    phone = models.CharField(max_length=20, blank=True)

    # Structured location, not just free-text address -- powers
    # Swiggy-style "show pharmacies in my area" search (see
    # catalog.views.search_medicine's `area` param) instead of only GPS
    # radius. See pharmacies.locations.AHMEDABAD_AREAS for valid areas.
    city = models.CharField(max_length=100, blank=True, db_index=True)
    state = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True, db_index=True)

    # Real opening hours, not a fabricated status badge -- "open now" is
    # computed from these at request time (see utils.is_open_now), in the
    # pharmacy's local time (IST). is_24_7 short-circuits the hours check.
    is_24_7 = models.BooleanField(default=False)
    opens_at = models.TimeField(null=True, blank=True)
    closes_at = models.TimeField(null=True, blank=True)

    # The matching accounts.Pharmacy.id on the pharmacy-side portal (set by
    # sync_pharmacy_data via IntegrationExportDataView's pharmacy_id).
    # Needed to route order webhooks to the right pharmacy there -- unlike
    # catalog sync, orders can't be matched by name after the fact.
    backend_id = models.IntegerField(null=True, blank=True, db_index=True)

    def __str__(self):
        return self.name


class MedicineStock(models.Model):
    """Current price/quantity of one medicine at one pharmacy.
    This table is expected to be owned/updated by the existing
    pharmacy-side portal; the customer portal only reads from it.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name="stocks")
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name="stocks")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("medicine", "pharmacy")
        indexes = [models.Index(fields=["medicine", "quantity"])]

    def __str__(self):
        return f"{self.medicine.brand_name} @ {self.pharmacy.name}"


class PriceLog(models.Model):
    """Historical price snapshots, used later by the demand-forecasting
    module and by price-drop alerts."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock = models.ForeignKey(MedicineStock, on_delete=models.CASCADE, related_name="price_history")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    recorded_at = models.DateTimeField(auto_now_add=True)


class PharmacyReview(models.Model):
    """Rates the PHARMACY as a business (service, availability, etc.) --
    deliberately never a medicine rating, which would drift into clinical
    'this brand works better' territory that's out of scope for this
    platform (see catalog.Salt docstring)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pharmacy_reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("pharmacy", "user")
        ordering = ["-created_at"]
