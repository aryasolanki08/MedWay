import time

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from catalog.models import Medicine, Salt
from pharmacies.locations import AREA_COORDINATES
from pharmacies.models import MedicineStock, Pharmacy, PriceLog

# Fallback coordinates (Ahmedabad city centre) used when a newly-seen
# pharmacy can't be geocoded from its address -- keeps the sync usable
# offline / when the free geocoder rate-limits us, rather than failing.
FALLBACK_LAT, FALLBACK_LNG = 23.0225, 72.5714

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


class Command(BaseCommand):
    """Pulls real pharmacy/medicine/stock data from the pharmacy-side
    portal (via its /api/auth/integration/export-data/ endpoint) and
    upserts it into this portal's read-only replica tables
    (pharmacies.Pharmacy/MedicineStock, catalog.Salt/Medicine), logging a
    PriceLog entry whenever a price actually changed. Safe to re-run --
    everything is matched by name, not recreated."""

    help = "Sync real pharmacy inventory from the pharmacy-side portal into this portal's database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-geocode",
            action="store_true",
            help="Skip live geocoding of new pharmacy addresses; use the fallback coordinates instead.",
        )

    def handle(self, *args, **options):
        if not settings.PHARMACY_API_KEY:
            raise CommandError(
                "PHARMACY_API_KEY is not set. Run `seed_integration_key` on the pharmacy "
                "backend and set the printed key as PHARMACY_API_KEY in this backend's .env."
            )

        url = f"{settings.PHARMACY_API_BASE_URL.rstrip('/')}/api/auth/integration/export-data/"
        try:
            response = requests.get(
                url, headers={"X-API-Key": settings.PHARMACY_API_KEY}, timeout=30
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise CommandError(f"Could not reach pharmacy portal at {url}: {exc}")

        pharmacies_data = response.json().get("pharmacies", [])
        stats = {"pharmacies": 0, "medicines": 0, "stock_updated": 0, "price_logged": 0}

        for pharmacy_data in pharmacies_data:
            pharmacy = self._get_or_create_pharmacy(pharmacy_data, geocode=not options["no_geocode"])
            stats["pharmacies"] += 1

            for med_data in pharmacy_data.get("medicines", []):
                medicine = self._get_or_create_medicine(med_data)
                stats["medicines"] += 1

                price = med_data.get("selling_price") or med_data.get("mrp") or 0
                quantity = med_data.get("stock_quantity") or 0
                stock, created = MedicineStock.objects.get_or_create(
                    medicine=medicine,
                    pharmacy=pharmacy,
                    defaults={"price": price, "quantity": quantity},
                )
                price_changed = not created and str(stock.price) != str(price)
                if not created:
                    stock.price = price
                    stock.quantity = quantity
                    stock.save(update_fields=["price", "quantity", "updated_at"])
                stats["stock_updated"] += 1

                if created or price_changed:
                    PriceLog.objects.create(stock=stock, price=price)
                    stats["price_logged"] += 1

        self.stdout.write(self.style.SUCCESS(
            f"Synced {stats['pharmacies']} pharmacies, {stats['medicines']} medicine lines, "
            f"{stats['stock_updated']} stock rows updated, {stats['price_logged']} price points logged."
        ))

    def _get_or_create_pharmacy(self, pharmacy_data, geocode):
        name = pharmacy_data["name"].strip()
        backend_id = pharmacy_data.get("pharmacy_id")
        area = pharmacy_data.get("area") or ""
        pharmacy = Pharmacy.objects.filter(name__iexact=name).first()
        if pharmacy:
            if pharmacy_data.get("address"):
                pharmacy.address = pharmacy_data["address"]
            if pharmacy_data.get("phone"):
                pharmacy.phone = pharmacy_data["phone"]
            if pharmacy_data.get("city"):
                pharmacy.city = pharmacy_data["city"]
            if pharmacy_data.get("state"):
                pharmacy.state = pharmacy_data["state"]
            if area:
                pharmacy.area = area
            pharmacy.backend_id = backend_id
            pharmacy.save()
            return pharmacy

        # Prefer the area's known-real coordinates (see
        # pharmacies.locations.AREA_COORDINATES) over live-geocoding the
        # free-text address -- more reliable and doesn't burn a Nominatim
        # call when we already know where the area is.
        address = pharmacy_data.get("address") or ""
        if area in AREA_COORDINATES:
            lat, lng = AREA_COORDINATES[area]
        else:
            lat, lng = FALLBACK_LAT, FALLBACK_LNG
            if geocode and address:
                geocoded = self._geocode(address)
                if geocoded:
                    lat, lng = geocoded

        return Pharmacy.objects.create(
            name=name,
            address=address,
            lat=lat,
            lng=lng,
            phone=pharmacy_data.get("phone", ""),
            city=pharmacy_data.get("city", ""),
            state=pharmacy_data.get("state", ""),
            area=area,
            backend_id=backend_id,
        )

    def _geocode(self, address):
        try:
            resp = requests.get(
                NOMINATIM_URL,
                params={"q": address, "format": "json", "limit": 1},
                headers={"User-Agent": "medway-customer-portal-sync/1.0"},
                timeout=10,
            )
            resp.raise_for_status()
            results = resp.json()
            if results:
                return float(results[0]["lat"]), float(results[0]["lon"])
        except (requests.RequestException, ValueError, KeyError, IndexError):
            pass
        finally:
            time.sleep(1)  # be polite to Nominatim's free tier (1 req/sec)
        return None

    def _get_or_create_medicine(self, med_data):
        salt_name = (med_data.get("salt_composition") or "").strip() or med_data["name"].strip()
        salt, _ = Salt.objects.get_or_create(name=salt_name)

        medicine, _ = Medicine.objects.get_or_create(
            salt=salt,
            brand_name=med_data["name"].strip(),
            defaults={
                "manufacturer": med_data.get("manufacturer", "") or "",
                "is_generic": False,
            },
        )
        return medicine
