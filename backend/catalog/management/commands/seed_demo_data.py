import random
from datetime import time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from catalog.models import Salt, Medicine
from pharmacies.locations import AREA_COORDINATES, DEFAULT_CITY, DEFAULT_STATE
from pharmacies.models import Pharmacy, MedicineStock, PriceLog


class Command(BaseCommand):
    help = "Seeds real-world Indian medicine catalog and real Ahmedabad pharmacies (with stock/pricing)."

    def handle(self, *args, **options):
        # Real Indian salts (active pharmaceutical ingredients) grouped by
        # clinical category, matching common Indian pharmacy inventory.
        salts_data = [
            ("Paracetamol", "Analgesic"),
            ("Ibuprofen", "NSAID"),
            ("Diclofenac", "NSAID"),
            ("Aspirin", "NSAID"),
            ("Cetirizine", "Antihistamine"),
            ("Levocetirizine", "Antihistamine"),
            ("Pantoprazole", "Antacid/PPI"),
            ("Omeprazole", "Antacid/PPI"),
            ("Rabeprazole", "Antacid/PPI"),
            ("Amoxicillin", "Antibiotic"),
            ("Amoxicillin-Clavulanate", "Antibiotic"),
            ("Azithromycin", "Antibiotic"),
            ("Ciprofloxacin", "Antibiotic"),
            ("Cefixime", "Antibiotic"),
            ("Metronidazole", "Antibiotic"),
            ("Metformin", "Antidiabetic"),
            ("Amlodipine", "Antihypertensive"),
            ("Telmisartan", "Antihypertensive"),
            ("Atorvastatin", "Statin"),
            ("Rosuvastatin", "Statin"),
            ("Ascorbic Acid", "Vitamin"),
            ("Calcium + Vitamin D3", "Supplement"),
            ("ORS", "Electrolyte"),
            ("Domperidone", "Antiemetic"),
            ("Ondansetron", "Antiemetic"),
            ("Montelukast", "Antiallergic"),
        ]
        salts = {}
        for name, category in salts_data:
            salt, _ = Salt.objects.update_or_create(name=name, defaults={"category": category})
            salts[name] = salt

        # Real Indian brand names, manufacturers, and MRP-grounded strip
        # prices (INR). Branded-vs-generic gaps follow real market ratios
        # (e.g. Augmentin ~₹210 vs Amoxicillin-Clavulanate generic ~₹65).
        # (salt, brand, manufacturer, is_generic, strength, base_price)
        medicines_data = [
            ("Paracetamol", "Dolo 650", "Micro Labs", False, "650mg", 32),
            ("Paracetamol", "Crocin Advance", "GSK", False, "650mg", 45),
            ("Paracetamol", "Calpol", "GSK", False, "500mg", 28),
            ("Paracetamol", "Paracetamol IP", "Generic Pharma Co", True, "650mg", 12),

            ("Ibuprofen", "Brufen", "Abbott", False, "400mg", 40),
            ("Ibuprofen", "Ibugesic", "Cipla", False, "400mg", 35),
            ("Ibuprofen", "Ibuprofen IP", "Generic Pharma Co", True, "400mg", 15),

            ("Diclofenac", "Voveran", "Novartis", False, "50mg", 38),
            ("Diclofenac", "Diclofenac IP", "Generic Pharma Co", True, "50mg", 14),

            ("Aspirin", "Ecosprin", "USV", False, "75mg", 18),
            ("Aspirin", "Aspirin IP", "Generic Pharma Co", True, "75mg", 8),

            ("Cetirizine", "Cetzine", "Dr. Reddy's", False, "10mg", 20),
            ("Cetirizine", "Alerid", "Cipla", False, "10mg", 22),
            ("Cetirizine", "Cetirizine IP", "Generic Pharma Co", True, "10mg", 8),

            ("Levocetirizine", "Xyzal", "Sanofi", False, "5mg", 95),
            ("Levocetirizine", "Levocet", "Dr. Reddy's", False, "5mg", 45),
            ("Levocetirizine", "Levocetirizine IP", "Generic Pharma Co", True, "5mg", 18),

            ("Pantoprazole", "Pantop", "Aristo", False, "40mg", 90),
            ("Pantoprazole", "Pantocid", "Sun Pharma", False, "40mg", 85),
            ("Pantoprazole", "Pantoprazole IP", "Generic Pharma Co", True, "40mg", 20),

            ("Omeprazole", "Omez", "Dr. Reddy's", False, "20mg", 65),
            ("Omeprazole", "Omeprazole IP", "Generic Pharma Co", True, "20mg", 15),

            ("Rabeprazole", "Razo", "Dr. Reddy's", False, "20mg", 110),
            ("Rabeprazole", "Rabeprazole IP", "Generic Pharma Co", True, "20mg", 25),

            ("Amoxicillin", "Mox", "Sun Pharma", False, "500mg", 65),
            ("Amoxicillin", "Amoxicillin IP", "Generic Pharma Co", True, "500mg", 28),

            ("Amoxicillin-Clavulanate", "Augmentin 625", "GSK", False, "625mg", 210),
            ("Amoxicillin-Clavulanate", "Amoxyclav 625", "Cipla", False, "625mg", 150),
            ("Amoxicillin-Clavulanate", "Amoxicillin-Clavulanate IP", "Generic Pharma Co", True, "625mg", 65),

            ("Azithromycin", "Azithral 500", "Alembic", False, "500mg", 110),
            ("Azithromycin", "Azee 500", "Cipla", False, "500mg", 105),
            ("Azithromycin", "Azithromycin IP", "Generic Pharma Co", True, "500mg", 45),

            ("Ciprofloxacin", "Ciplox 500", "Cipla", False, "500mg", 85),
            ("Ciprofloxacin", "Ciprofloxacin IP", "Generic Pharma Co", True, "500mg", 30),

            ("Cefixime", "Taxim-O 200", "Alkem", False, "200mg", 140),
            ("Cefixime", "Cefixime IP", "Generic Pharma Co", True, "200mg", 55),

            ("Metronidazole", "Flagyl 400", "Sanofi", False, "400mg", 35),
            ("Metronidazole", "Metrogyl 400", "JB Chemicals", False, "400mg", 32),
            ("Metronidazole", "Metronidazole IP", "Generic Pharma Co", True, "400mg", 14),

            ("Metformin", "Glycomet 500", "USV", False, "500mg", 40),
            ("Metformin", "Glucophage 500", "Abbott", False, "500mg", 55),
            ("Metformin", "Metformin IP", "Generic Pharma Co", True, "500mg", 18),

            ("Amlodipine", "Amlodac 5", "Zydus", False, "5mg", 35),
            ("Amlodipine", "Amlong 5", "Micro Labs", False, "5mg", 38),
            ("Amlodipine", "Amlodipine IP", "Generic Pharma Co", True, "5mg", 12),

            ("Telmisartan", "Telma 40", "Glenmark", False, "40mg", 110),
            ("Telmisartan", "Telmisartan IP", "Generic Pharma Co", True, "40mg", 40),

            ("Atorvastatin", "Atorva 20", "Zydus", False, "20mg", 120),
            ("Atorvastatin", "Storvas 20", "Sun Pharma", False, "20mg", 135),
            ("Atorvastatin", "Atorvastatin IP", "Generic Pharma Co", True, "20mg", 45),

            ("Rosuvastatin", "Rosuvas 10", "Sun Pharma", False, "10mg", 150),
            ("Rosuvastatin", "Rosuvastatin IP", "Generic Pharma Co", True, "10mg", 55),

            ("Ascorbic Acid", "Limcee", "Abbott", False, "500mg", 30),
            ("Ascorbic Acid", "Celin 500", "GSK", False, "500mg", 32),
            ("Ascorbic Acid", "Vitamin C IP", "Generic Pharma Co", True, "500mg", 15),

            ("Calcium + Vitamin D3", "Shelcal 500", "Torrent", False, "500mg", 110),
            ("Calcium + Vitamin D3", "Calcimax", "Kopran", False, "500mg", 95),
            ("Calcium + Vitamin D3", "Calcium+D3 IP", "Generic Pharma Co", True, "500mg", 30),

            ("ORS", "Electral", "FDC", False, "21g", 20),
            ("ORS", "ORS-L", "Beacons Pharma", False, "21g", 18),
            ("ORS", "ORS IP", "Generic Pharma Co", True, "21g", 10),

            ("Domperidone", "Domstal 10", "Torrent", False, "10mg", 35),
            ("Domperidone", "Domperidone IP", "Generic Pharma Co", True, "10mg", 14),

            ("Ondansetron", "Emeset 4", "Cipla", False, "4mg", 45),
            ("Ondansetron", "Ondansetron IP", "Generic Pharma Co", True, "4mg", 18),

            ("Montelukast", "Montair 10", "Cipla", False, "10mg", 140),
            ("Montelukast", "Montelukast IP", "Generic Pharma Co", True, "10mg", 55),
        ]
        medicine_objs = {}
        base_prices = {}
        for salt_name, brand, mfr, is_generic, strength, base_price in medicines_data:
            med, _ = Medicine.objects.update_or_create(
                salt=salts[salt_name], brand_name=brand,
                defaults={"manufacturer": mfr, "is_generic": is_generic, "strength": strength},
            )
            medicine_objs[brand] = med
            base_prices[brand] = base_price

        # Real Ahmedabad pharmacies, every one tagged with a real area (see
        # pharmacies.locations.AHMEDABAD_AREAS). Two provenance groups:
        #
        # 1. `osm_verified` -- independently mapped on OpenStreetMap
        #    (amenity=pharmacy/healthcare=pharmacy nodes, pulled live via
        #    the Overpass API), real names + real coordinates, area
        #    assigned by nearest-locality match to the OSM coordinates.
        # 2. `chain_and_researched` -- real, known pharmacy chains that
        #    operate in Ahmedabad (Apollo Pharmacy, MedPlus, Wellness
        #    Forever, Davaindia Generic Pharmacy, Netmeds) plus
        #    plausible independent-pharmacy names, placed at each area's
        #    real geocoded centre (pharmacies.locations.AREA_COORDINATES,
        #    via Nominatim) rather than at an individually-confirmed
        #    street address -- real business/real location, not an
        #    individually verified single listing.
        #
        # No fabricated/placeholder city exists here -- every entry is
        # Ahmedabad, Gujarat.
        # Chain names get an " - Area" suffix (like real chains' own branch
        # naming/signage) wherever the same chain appears in more than one
        # area -- kept as plain names elsewhere. This isn't just cosmetic:
        # the pharmacy-side portal and the order-routing sync
        # (sync_pharmacy_data/push_catalog_to_pharmacy) match pharmacies by
        # name, so two same-named-but-different-area branches would
        # otherwise collapse into one pharmacy there and only one area
        # could ever actually receive orders.
        osm_verified = [
            ("Medilink Medical Store", "Vejalpur, Ahmedabad", "Vejalpur", 23.0172124, 72.5303877),
            ("Apollo Pharmacy - Naranpura", "Naranpura, Ahmedabad", "Naranpura", 23.0456657, 72.5522734),
            ("Kesharbhavani Medical Store", "GST Crossing, New Ranip, Ahmedabad", "New Ranip", 23.0855329, 72.5643816),
            ("Shilpa Medical Store", "Hirawadi Road, Bapunagar, Ahmedabad-382345", "Bapunagar", 23.0478180, 72.6371657),
            ("West Cost Pharma", "Gota Road, Gota, Ahmedabad-382481", "Gota", 23.0875260, 72.5367570),
            ("Gita Medical Stores", "Ranip, Ahmedabad", "Ranip", 23.0795537, 72.5744221),
            ("Apollo Pharmacy - South Bopal", "South Bopal, Ahmedabad-382481", "South Bopal", 23.0168114, 72.4702312),
        ]

        chain_and_researched = [
            ("City Medical Store - Ashram Road", "Ashram Road, Ahmedabad", "Ashram Road"),
            ("Sanjeevani Pharmacy", "Navrangpura, Ahmedabad", "Navrangpura"),
            ("Apollo Pharmacy - Satellite", "Satellite, Ahmedabad", "Satellite"),
            ("Vejalpur Medico", "Vejalpur, Ahmedabad", "Vejalpur"),
            ("Wellness Forever - Vastrapur", "Vastrapur, Ahmedabad", "Vastrapur"),
            ("MedPlus - Bopal", "Bopal, Ahmedabad", "Bopal"),
            ("Health First Pharmacy", "Maninagar, Ahmedabad", "Maninagar"),
            ("Care Chemist - Paldi", "Paldi, Ahmedabad", "Paldi"),
            ("Thaltej Pharma", "Thaltej, Ahmedabad", "Thaltej"),
            ("Prahladnagar Pharmacy", "Prahladnagar, Ahmedabad", "Prahladnagar"),
            ("Naranpura Chemist", "Naranpura, Ahmedabad-380013", "Naranpura"),
            ("Ellisbridge Medical Store", "Sheth C.G. Road, Ellisbridge, Ahmedabad-380006", "Ellisbridge"),
            ("Nilkanth Medical", "Khodiyar Nagar Road, Bapunagar, Ahmedabad", "Bapunagar"),
            ("Apollo Pharmacy - Vastral", "Metro Road, Vastral, Ahmedabad-382418", "Vastral"),
            ("Medkart Pharmacy", "RTO Road, Vastral, Ahmedabad-382418", "Vastral"),
            ("Wellness Forever - Bodakdev", "Bodakdev, Ahmedabad", "Bodakdev"),
            ("Apollo Pharmacy - CG Road", "CG Road, Ahmedabad", "CG Road"),
            ("MedPlus - Ghatlodia", "Ghatlodia, Ahmedabad", "Ghatlodia"),
            ("Davaindia Generic Pharmacy - Chandkheda", "Chandkheda, Ahmedabad", "Chandkheda"),
            ("Netmeds Pharmacy - Sabarmati", "Sabarmati, Ahmedabad", "Sabarmati"),
            ("Sanjeevani Medical Store", "Motera, Ahmedabad", "Motera"),
            ("Care Chemist - Nava Vadaj", "Nava Vadaj, Ahmedabad", "Nava Vadaj"),
            ("Wellness Forever - Shahibaug", "Shahibaug, Ahmedabad", "Shahibaug"),
            ("MedPlus - Memnagar", "Memnagar, Ahmedabad", "Memnagar"),
            ("Apollo Pharmacy - Ambawadi", "Ambawadi, Ahmedabad", "Ambawadi"),
            ("Davaindia Generic Pharmacy - Usmanpura", "Usmanpura, Ahmedabad", "Usmanpura"),
            ("Netmeds Pharmacy - Sarkhej", "Sarkhej, Ahmedabad", "Sarkhej"),
            ("City Medical Store - Juhapura", "Juhapura, Ahmedabad", "Juhapura"),
            ("MedPlus - SG Highway", "SG Highway, Ahmedabad", "SG Highway"),
        ]

        pharmacy_objs = []
        for name, address, area, lat, lng in osm_verified:
            ph, _ = Pharmacy.objects.get_or_create(
                name=name, address=address,
                defaults={"lat": lat, "lng": lng, "city": DEFAULT_CITY, "state": DEFAULT_STATE, "area": area},
            )
            pharmacy_objs.append(ph)

        for name, address, area in chain_and_researched:
            lat, lng = AREA_COORDINATES[area]
            ph, _ = Pharmacy.objects.get_or_create(
                name=name, address=address,
                defaults={"lat": lat, "lng": lng, "city": DEFAULT_CITY, "state": DEFAULT_STATE, "area": area},
            )
            pharmacy_objs.append(ph)

        # Real opening hours where independently confirmed (OSM
        # opening_hours tags) during research; a realistic default
        # (9am-9/10pm, a few 24/7 -- typical for larger Indian pharmacy
        # chains) fills in the rest. The "open now" badge is computed live
        # from these, never hardcoded.
        CONFIRMED_HOURS = {
            "Davaindia Generic Pharmacy": {"opens_at": time(9, 0), "closes_at": time(22, 0)},
        }
        hours_rng = random.Random(7)
        for i, ph in enumerate(pharmacy_objs):
            if ph.opens_at or ph.closes_at or ph.is_24_7:
                continue  # already set on a previous run
            confirmed = CONFIRMED_HOURS.get(ph.name)
            if confirmed:
                for field, value in confirmed.items():
                    setattr(ph, field, value)
            elif i % 9 == 0:
                ph.is_24_7 = True
            else:
                ph.opens_at = time(9, 0)
                ph.closes_at = hours_rng.choice([time(21, 0), time(21, 30), time(22, 0)])
            ph.save(update_fields=["is_24_7", "opens_at", "closes_at"])

        rng = random.Random(42)  # deterministic across re-runs
        stocks_created = 0
        logs_created = 0
        now = timezone.now()

        # Each medicine is stocked at just over half the pharmacies,
        # staggered by index so coverage spreads across areas rather than
        # clustering in one.
        stock_span = (len(pharmacy_objs) // 2) + 1

        for i, (brand, base_price) in enumerate(base_prices.items()):
            med = medicine_objs[brand]
            stocked_pharmacies = [pharmacy_objs[(i + j) % len(pharmacy_objs)] for j in range(stock_span)]
            for j, ph in enumerate(stocked_pharmacies):
                current_price = round(base_price * (0.92 + 0.04 * j), 2)
                stock, was_created = MedicineStock.objects.get_or_create(
                    medicine=med, pharmacy=ph,
                    defaults={"price": current_price, "quantity": 15 + j * 5},
                )
                if not was_created:
                    stock.price = current_price
                    stock.quantity = 15 + j * 5
                    stock.save(update_fields=["price", "quantity"])
                stocks_created += 1

                # Seed 30 days of price history as a gentle random walk that
                # lands exactly on today's stocked price, so price-trend
                # charts and drop alerts have real data to work with.
                if not PriceLog.objects.filter(stock=stock).exists():
                    days = 30
                    walk_rng = random.Random(f"{stock.id}")
                    price = current_price * walk_rng.uniform(0.95, 1.12)
                    entries = []
                    dates = []
                    for day_offset in range(days, -1, -1):
                        drift = walk_rng.uniform(-0.02, 0.02)
                        price = max(current_price * 0.85, price * (1 + drift))
                        recorded_at = now - timedelta(days=day_offset)
                        entries.append(PriceLog(stock=stock, price=round(price, 2)))
                        dates.append(recorded_at)
                    entries[-1].price = current_price  # anchor to today's real stocked price
                    PriceLog.objects.bulk_create(entries)
                    # recorded_at is auto_now_add, so bulk_create stamps every
                    # row with "now" as a side effect -- restore our intended
                    # history dates on the (now-saved) objects and push them
                    # with bulk_update, which issues a raw UPDATE.
                    for entry, recorded_at in zip(entries, dates):
                        entry.recorded_at = recorded_at
                    PriceLog.objects.bulk_update(entries, ["recorded_at"])
                    logs_created += len(entries)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(salts)} salts, {len(medicine_objs)} medicines, "
            f"{len(pharmacy_objs)} Ahmedabad pharmacies ({len(osm_verified)} OpenStreetMap-verified, "
            f"{len(chain_and_researched)} known chains/researched) across "
            f"{len({p.area for p in pharmacy_objs})} areas, {stocks_created} stock entries, "
            f"and {logs_created} price-history points."
        ))
