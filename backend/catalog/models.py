import uuid

from django.db import models


class Salt(models.Model):
    """A single active pharmaceutical composition, e.g. 'Paracetamol'.
    This is the pivot point for generic matching: every Medicine (brand
    or generic) that shares a Salt is a true substitute for every other.
    We deliberately do NOT link different salts (e.g. Paracetamol and
    Ibuprofen) as 'alternatives' -- that is a clinical judgment out of
    scope for this platform.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True, db_index=True)
    category = models.CharField(max_length=100, blank=True, help_text="e.g. Analgesic, Antibiotic")

    # Real usage info pulled from a free public drug-label API (openFDA),
    # not authored copy -- see catalog/management/commands/fetch_salt_info.py.
    # Blank means we don't have a clean match for this salt from that API.
    usage_purpose = models.CharField(max_length=255, blank=True)
    usage_info = models.TextField(blank=True)
    info_source = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.name


class Medicine(models.Model):
    FORM_CHOICES = [
        ("tablet", "Tablet"),
        ("capsule", "Capsule"),
        ("syrup", "Syrup"),
        ("injection", "Injection"),
        ("cream", "Cream/Ointment"),
        ("drops", "Drops"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    salt = models.ForeignKey(Salt, on_delete=models.CASCADE, related_name="medicines")
    brand_name = models.CharField(max_length=255, db_index=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    is_generic = models.BooleanField(default=False, db_index=True)
    strength = models.CharField(max_length=50, blank=True, help_text="e.g. 500mg")
    form = models.CharField(max_length=20, choices=FORM_CHOICES, default="tablet")

    class Meta:
        indexes = [models.Index(fields=["salt", "is_generic"])]

    def __str__(self):
        return f"{self.brand_name} ({self.salt.name})"
