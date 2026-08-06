import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from django.core.management.base import BaseCommand

from catalog.models import Salt

# Our Salt names -> the ingredient name openFDA indexes drug labels under.
# A few (Paracetamol -> Acetaminophen) differ between Indian/UK and US
# naming. Salts with no single well-defined active-ingredient match in
# openFDA (a fixed-dose combination, or a generic electrolyte/mineral mix)
# are left out on purpose -- we don't force a bad match.
OPENFDA_INGREDIENT = {
    "Paracetamol": "ACETAMINOPHEN",
    "Ibuprofen": "IBUPROFEN",
    "Diclofenac": "DICLOFENAC",
    "Aspirin": "ASPIRIN",
    "Cetirizine": "CETIRIZINE",
    "Levocetirizine": "LEVOCETIRIZINE",
    "Montelukast": "MONTELUKAST",
    "Pantoprazole": "PANTOPRAZOLE",
    "Omeprazole": "OMEPRAZOLE",
    "Rabeprazole": "RABEPRAZOLE",
    "Azithromycin": "AZITHROMYCIN",
    "Amoxicillin": "AMOXICILLIN",
    "Cefixime": "CEFIXIME",
    "Ciprofloxacin": "CIPROFLOXACIN",
    "Metronidazole": "METRONIDAZOLE",
    "Domperidone": "DOMPERIDONE",
    "Ondansetron": "ONDANSETRON",
    "Metformin": "METFORMIN HYDROCHLORIDE",
    "Amlodipine": "AMLODIPINE BESYLATE",
    "Telmisartan": "TELMISARTAN",
    "Atorvastatin": "ATORVASTATIN CALCIUM",
    "Rosuvastatin": "ROSUVASTATIN CALCIUM",
    "Ascorbic Acid": "ASCORBIC ACID",
}

LABEL_BOILERPLATE_RE = re.compile(
    r"^\s*\d*\s*INDICATIONS AND USAGE\s*", re.IGNORECASE
)


def _clean_indications(text, limit=280):
    text = LABEL_BOILERPLATE_RE.sub("", text).strip()
    if len(text) <= limit:
        return text
    # Cut at the last sentence boundary before `limit`, else last space.
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("; "))
    if end > limit * 0.4:
        return cut[: end + 1].strip()
    return cut[: cut.rfind(" ")].strip() + "..."


class Command(BaseCommand):
    help = (
        "Fetches real drug usage/purpose text from openFDA's free public "
        "drug label API for each known Salt and stores it on the Salt row, "
        "for the Medicine Info assistant to serve as real, sourced content."
    )

    def handle(self, *args, **options):
        updated = 0
        skipped = []

        for salt_name, ingredient in OPENFDA_INGREDIENT.items():
            salt = Salt.objects.filter(name=salt_name).first()
            if not salt:
                continue

            picked = self._fetch(ingredient)
            if not picked:
                skipped.append(salt_name)
                # Don't leave a stale match from a previous run (e.g. one a
                # later quality filter would now reject) sitting in the DB.
                if salt.usage_info or salt.usage_purpose or salt.info_source:
                    salt.usage_purpose = ""
                    salt.usage_info = ""
                    salt.info_source = ""
                    salt.save(update_fields=["usage_purpose", "usage_info", "info_source"])
                time.sleep(0.25)
                continue

            salt.usage_purpose = (picked.get("purpose") or "").replace("Purpose", "").strip(" .:")
            salt.usage_info = _clean_indications(picked["indications"])
            salt.info_source = "openFDA drug label API"
            salt.save(update_fields=["usage_purpose", "usage_info", "info_source"])
            updated += 1
            time.sleep(0.25)  # be polite to the free public API

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} salts from openFDA."))
        if skipped:
            self.stdout.write(self.style.WARNING(f"No clean match for: {', '.join(skipped)}"))

    def _fetch(self, ingredient):
        query = urllib.parse.quote(f'openfda.substance_name:"{ingredient}"')
        url = f"https://api.fda.gov/drug/label.json?search={query}&limit=5"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "medway-college-project/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.load(resp)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return None

        results = data.get("results", [])

        def is_junk(r, purpose, openfda):
            # openFDA's label index is dominated, for some substances, by
            # multi-ingredient homeopathic combination products where the
            # target salt is one of a dozen+ listed ingredients -- not a
            # real match for "what is this salt used for". Reject those.
            substances = openfda.get("substance_name") or []
            if len(substances) > 2:
                return True
            text = (purpose or "").lower()
            if "homeopathic" in text or "not fda evaluated" in text or "not accepted medical evidence" in text:
                return True
            return False

        # Prefer a consumer-facing OTC "Drug Facts" label (short "purpose" +
        # "indications"). Require oral route so we don't surface a topical/
        # injectable label's usage text for an oral tablet in our catalog.
        for r in results:
            openfda = r.get("openfda", {})
            product_type = (openfda.get("product_type") or [""])[0]
            route = (openfda.get("route") or [""])[0]
            purpose = (r.get("purpose") or [None])[0]
            indications = (r.get("indications_and_usage") or [None])[0]
            if purpose and indications and "HUMAN OTC" in product_type and route == "ORAL" and not is_junk(r, purpose, openfda):
                return {"purpose": purpose, "indications": indications}

        # Fall back to a prescription label's indications (truncated later)
        # -- still real, sourced data, just less consumer-phrased.
        for r in results:
            openfda = r.get("openfda", {})
            indications = (r.get("indications_and_usage") or [None])[0]
            if indications and not is_junk(r, None, openfda):
                return {"purpose": None, "indications": indications}

        return None
