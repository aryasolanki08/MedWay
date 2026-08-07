"""Shared symptom -> real-catalog matching, used by both the plain
lookup endpoint (assistant_query) and the AI voice consult endpoint
(assistant_consult) so they can never drift into answering from
different data.
"""

from catalog.models import Salt
from pharmacies.models import MedicineStock

from . import ai_match
from .reference_data import REFERENCE_DATA


def real_medicines_for_salt(salt_name):
    """Real medicines from the live catalog for one salt -- brand and
    generic, each with their current cheapest price across pharmacies --
    plus that salt's real usage info, sourced from openFDA's free public
    drug label API (see fetch_salt_info command), not authored copy. Never
    ranked by anything but price (ascending), same rule as
    catalog.search_medicine: no 'better medicine' ordering.
    """
    salt = Salt.objects.filter(name__iexact=salt_name).first()
    if not salt:
        return None

    medicines = []
    for medicine in salt.medicines.all():
        cheapest = (
            MedicineStock.objects.filter(medicine=medicine, quantity__gt=0)
            .order_by("price")
            .first()
        )
        if not cheapest:
            continue
        medicines.append({
            "medicine_id": str(medicine.id),
            "brand_name": medicine.brand_name,
            "manufacturer": medicine.manufacturer,
            "is_generic": medicine.is_generic,
            "strength": medicine.strength,
            "form": medicine.form,
            "from_price": float(cheapest.price),
            "pharmacy_count": MedicineStock.objects.filter(medicine=medicine, quantity__gt=0).count(),
        })

    medicines.sort(key=lambda m: m["from_price"])
    if not medicines:
        return None

    branded_prices = [m["from_price"] for m in medicines if not m["is_generic"]]
    generic_prices = [m["from_price"] for m in medicines if m["is_generic"]]
    savings_pct = None
    if branded_prices and generic_prices:
        cheapest_branded, cheapest_generic = min(branded_prices), min(generic_prices)
        if cheapest_branded > cheapest_generic:
            savings_pct = round((1 - cheapest_generic / cheapest_branded) * 100)

    return {
        "salt_name": salt.name,
        "salt_category": salt.category,
        "usage_purpose": salt.usage_purpose,
        "usage_info": salt.usage_info,
        "info_source": salt.info_source,
        "generic_savings_pct": savings_pct,
        "medicines": medicines,
    }


def match_symptom(text):
    """Keyword match first (free, instant); if nothing hits and a Gemini
    key is configured, fall back to ai_match's closed-vocabulary
    classifier. Either path lands on the same real-database lookup.
    Returns (matches, ai_assisted).
    """
    matched_keywords = {kw for kw in REFERENCE_DATA if kw in text}
    ai_assisted = False
    if not matched_keywords:
        ai_keys = ai_match.ai_match_keywords(text, set(REFERENCE_DATA.keys()))
        if ai_keys:
            matched_keywords = set(ai_keys)
            ai_assisted = True

    matches = []
    seen_categories = set()
    for keyword in matched_keywords:
        info = REFERENCE_DATA[keyword]
        if info["category"] in seen_categories:
            continue
        seen_categories.add(info["category"])
        salt_groups = [g for g in (real_medicines_for_salt(s) for s in info["salts"]) if g]
        matches.append({
            "category": info["category"],
            "info": info["info"],
            "salt_groups": salt_groups,
            "matched_via": "ai" if ai_assisted else "keyword",
        })

    return matches
