import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from pharmacies.models import MedicineStock, Pharmacy


class Command(BaseCommand):
    """The reverse of sync_pharmacy_data: pushes this portal's own catalog
    (the demo data seeded by seed_demo_data, plus anything added here)
    into the pharmacy-side portal's inventory, using its existing
    /api/auth/integration/register-data/ endpoint -- built for exactly
    this ("register its real-world pharmacies and medicines into this
    pharmacy portal's dummy dataset"). Together with sync_pharmacy_data,
    this keeps both portals showing the same pharmacies/medicines.

    Skips any pharmacy whose name already exists on the pharmacy side
    (i.e. pharmacies that got here via sync_pharmacy_data in the first
    place), so re-running this doesn't push data back to where it came
    from."""

    help = "Push this portal's pharmacy/medicine catalog into the pharmacy-side portal's inventory."

    def handle(self, *args, **options):
        if not settings.PHARMACY_API_KEY:
            raise CommandError(
                "PHARMACY_API_KEY is not set. Run `seed_integration_key` on the pharmacy "
                "backend and set the printed key as PHARMACY_API_KEY in this backend's .env."
            )

        base_url = settings.PHARMACY_API_BASE_URL.rstrip("/")
        headers = {"X-API-Key": settings.PHARMACY_API_KEY}

        try:
            existing = requests.get(f"{base_url}/api/auth/integration/export-data/", headers=headers, timeout=30)
            existing.raise_for_status()
        except requests.RequestException as exc:
            raise CommandError(f"Could not reach pharmacy portal at {base_url}: {exc}")

        already_there = {p["name"].strip().lower() for p in existing.json().get("pharmacies", [])}

        payload = []
        for pharmacy in Pharmacy.objects.all():
            if pharmacy.name.strip().lower() in already_there:
                continue

            stocks = MedicineStock.objects.filter(pharmacy=pharmacy).select_related("medicine", "medicine__salt")
            if not stocks:
                continue

            payload.append({
                "name": pharmacy.name,
                "address": pharmacy.address,
                "phone": pharmacy.phone,
                "city": pharmacy.city,
                "state": pharmacy.state,
                "area": pharmacy.area,
                "medicines": [
                    {
                        "name": stock.medicine.brand_name,
                        "salt_composition": stock.medicine.salt.name,
                        "manufacturer": stock.medicine.manufacturer,
                        "category": stock.medicine.salt.category,
                        "mrp": str(stock.price),
                        "selling_price": str(stock.price),
                        "stock_quantity": stock.quantity,
                    }
                    for stock in stocks
                ],
            })

        if not payload:
            self.stdout.write(self.style.WARNING("Nothing to push -- every pharmacy here already exists on the pharmacy side."))
            return

        response = requests.post(
            f"{base_url}/api/auth/integration/register-data/",
            headers=headers,
            json={"pharmacies": payload},
            timeout=120,
        )
        response.raise_for_status()
        result = response.json()

        self.stdout.write(self.style.SUCCESS(
            f"Pushed {len(payload)} pharmacies. Pharmacy side: "
            f"{result['pharmacies_created']} pharmacies created, {result['pharmacies_updated']} updated, "
            f"{result['medicines_created']} medicines created, {result['medicines_updated']} updated."
        ))
        if result.get("errors"):
            self.stdout.write(self.style.ERROR(f"{len(result['errors'])} errors:"))
            for err in result["errors"][:20]:
                self.stdout.write(f"  - {err}")
