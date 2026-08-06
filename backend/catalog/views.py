from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from pharmacies.models import MedicineStock
from pharmacies.utils import haversine_km
from . import ocr
from .models import Salt, Medicine
from .salt_resolution import resolve_salt


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_medicine(request):
    """Resolve a free-text query (brand or salt name) to a Salt, then
    return every Medicine sharing that salt -- split into branded vs
    generic -- joined with live pharmacy stock/price, sorted by price
    ascending. Alternatives are ALWAYS same-salt only: we never cross
    into other drug classes, since that would be a clinical claim this
    platform doesn't make.
    """
    query = request.GET.get("q", "").strip()
    is_generic_param = request.GET.get("is_generic")  # "true" | "false" | None
    lat = request.GET.get("lat")
    lng = request.GET.get("lng")
    radius_km = float(request.GET.get("radius_km", 10))
    avoid_nsaids = request.GET.get("avoid_nsaids", "false").lower() == "true"
    # Swiggy-style area filter: when set, show every pharmacy in that
    # named area (see pharmacies.locations.AHMEDABAD_AREAS) instead of a
    # GPS radius -- exact match, no widening. Omit it to keep the old
    # lat/lng-radius behavior (map view, callers that don't have an area).
    area = request.GET.get("area", "").strip()

    if not query:
        return Response({"detail": "q parameter is required"}, status=400)

    salt = resolve_salt(query)
    if not salt:
        return Response({"salt": None, "results": [], "potential_savings": None})

    base_medicines = Medicine.objects.filter(salt=salt)

    # Simple, transparent safety filter -- not a recommendation, a hide.
    if avoid_nsaids and salt.category.lower() == "nsaid":
        base_medicines = base_medicines.none()

    medicines = base_medicines
    if is_generic_param is not None:
        medicines = medicines.filter(is_generic=(is_generic_param.lower() == "true"))

    def stocks_to_results(medicine_qs, max_radius=None):
        stocks = (
            MedicineStock.objects.filter(medicine__in=medicine_qs, quantity__gt=0)
            .select_related("medicine", "pharmacy")
        )
        if area:
            stocks = stocks.filter(pharmacy__area__iexact=area)
        out = []
        for stock in stocks:
            distance = None
            if lat and lng:
                distance = haversine_km(float(lat), float(lng), stock.pharmacy.lat, stock.pharmacy.lng)
                if not area and max_radius is not None and distance > max_radius:
                    continue
            out.append(
                {
                    "stock_id": str(stock.id),
                    "medicine_id": str(stock.medicine.id),
                    "brand_name": stock.medicine.brand_name,
                    "manufacturer": stock.medicine.manufacturer,
                    "is_generic": stock.medicine.is_generic,
                    "strength": stock.medicine.strength,
                    "form": stock.medicine.form,
                    "price": float(stock.price),
                    "quantity": stock.quantity,
                    "pharmacy_id": str(stock.pharmacy.id),
                    "pharmacy_name": stock.pharmacy.name,
                    "pharmacy_lat": stock.pharmacy.lat,
                    "pharmacy_lng": stock.pharmacy.lng,
                    "distance_km": round(distance, 2) if distance is not None else None,
                }
            )
        return out

    # What's actually shown for the active tab.
    results = stocks_to_results(medicines, max_radius=radius_km)

    # If nothing is in range, widen progressively before giving up -- a
    # tight radius shouldn't look like a broken search, and if the nearest
    # stock is genuinely far away (e.g. a real device location nowhere
    # near the seeded pharmacies), show it anyway with its real distance
    # rather than a dead end. Flagged so the frontend can be upfront about it.
    radius_widened = False
    effective_radius = radius_km
    if not area and not results and lat and lng:
        if radius_km < 50:
            results = stocks_to_results(medicines, max_radius=50)
            if results:
                radius_widened = True
                effective_radius = 50
        if not results:
            results = stocks_to_results(medicines, max_radius=None)
            if results:
                radius_widened = True
                effective_radius = None

    # Default sort: price ascending (lowest first). We never rank by
    # perceived drug "quality" -- only by objective, comparable facts.
    results.sort(key=lambda r: r["price"])

    # Savings compare branded vs generic across the WHOLE salt, not just the
    # active tab -- otherwise a single-tab filter would always zero out one
    # side of the comparison and savings could never be shown.
    all_results = results if is_generic_param is None else stocks_to_results(base_medicines, max_radius=effective_radius)
    branded_prices = [r["price"] for r in all_results if not r["is_generic"]]
    generic_prices = [r["price"] for r in all_results if r["is_generic"]]
    savings = None
    if branded_prices and generic_prices:
        savings = round(min(branded_prices) - min(generic_prices), 2)
        savings = savings if savings > 0 else None

    return Response(
        {
            "salt": salt.name,
            "salt_category": salt.category,
            "results": results,
            "potential_savings": savings,
            "radius_widened": radius_widened,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def prescription_ocr(request):
    """Reads text off an uploaded prescription photo and matches it against
    known brand names/salts -- a search-input shortcut only. It never infers
    dosage or what to take; it hands back candidate medicines for the user
    to search normally, same as if they'd typed the name themselves.
    """
    image = request.FILES.get("image")
    if not image:
        return Response({"detail": "image file is required"}, status=400)
    if image.size > 8 * 1024 * 1024:
        return Response({"detail": "Image too large (max 8MB)."}, status=400)

    try:
        lines = ocr.extract_lines(image.read())
    except Exception:
        return Response({"detail": "Couldn't process that image. Try a clearer photo."}, status=422)

    salts = list(Salt.objects.values_list("id", "name", "category"))
    medicines = list(
        Medicine.objects.select_related("salt").values_list(
            "id", "brand_name", "salt__name", "is_generic", "strength"
        )
    )
    matches = ocr.match_candidates(lines, salts, medicines)

    return Response({"raw_lines": [l["text"] for l in lines], "matches": matches})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def autocomplete(request):
    query = request.GET.get("q", "").strip()
    if len(query) < 2:
        return Response({"suggestions": []})

    salt_matches = list(Salt.objects.filter(name__icontains=query).values_list("name", flat=True)[:5])
    brand_matches = list(
        Medicine.objects.filter(brand_name__icontains=query).values_list("brand_name", flat=True).distinct()[:5]
    )
    suggestions = sorted(set(salt_matches + brand_matches))
    return Response({"suggestions": suggestions})
