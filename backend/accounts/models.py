import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Customer-side user. Location is used only for distance-based
    pharmacy search, and optional health flags are used only to FILTER
    results (e.g. hide NSAIDs) -- never to recommend a specific medicine.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=15, blank=True)
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    location_label = models.CharField(max_length=255, blank=True)

    # Structured home location, set at registration -- drives default
    # search/browse ("show pharmacies in my area", see
    # catalog.views.search_medicine). location_lat/lng above are still
    # used for on-map display and get backfilled from the area's
    # representative coordinates unless the user overrides them via the
    # free-text geocode flow in Profile.jsx.
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True, db_index=True)

    # Optional, user-declared, used purely to filter out contraindicated
    # categories client-side/server-side -- not for generating advice.
    avoid_nsaids = models.BooleanField(default=False)

    # Set only for accounts created/linked via "Sign in with Google" --
    # Google's stable per-user subject id (the ID token's "sub" claim).
    # Matching on this (not email) is what Google itself recommends, since
    # a user's email can change but sub never does.
    google_sub = models.CharField(max_length=255, blank=True, null=True, unique=True, db_index=True)

    def __str__(self):
        return self.username
