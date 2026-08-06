from django.db.models import Avg, Count, Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Pharmacy, MedicineStock, PriceLog, PharmacyReview
from .serializers import PharmacySerializer, PharmacyReviewSerializer
from .utils import haversine_km


def _rated_pharmacies_queryset():
    generic_stock_subquery = MedicineStock.objects.filter(
        pharmacy=OuterRef("pk"), medicine__is_generic=True, quantity__gt=0
    )
    qs = Pharmacy.objects.annotate(
        avg_rating=Avg("reviews__rating"),
        review_count=Count("reviews", distinct=True),
        _has_generic_stock=Exists(generic_stock_subquery),
    )
    return qs


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def nearby_pharmacies(request):
    lat = request.GET.get("lat")
    lng = request.GET.get("lng")
    radius_km = float(request.GET.get("radius_km", 5))

    if not lat or not lng:
        return Response({"detail": "lat and lng are required"}, status=400)

    lat, lng = float(lat), float(lng)

    def pharmacies_within(radius):
        found = []
        for pharmacy in _rated_pharmacies_queryset():
            distance = haversine_km(lat, lng, pharmacy.lat, pharmacy.lng)
            if distance <= radius:
                data = PharmacySerializer(pharmacy).data
                data["distance_km"] = round(distance, 2)
                found.append(data)
        return found

    results = pharmacies_within(radius_km)

    # Same progressive-widen fallback as catalog search: don't let a tight
    # radius, or a real device location nowhere near the seeded pharmacies,
    # look like a broken map -- show what exists with its real distance.
    radius_widened = False
    if not results and radius_km < 50:
        results = pharmacies_within(50)
        radius_widened = bool(results)
    if not results:
        results = pharmacies_within(float("inf"))
        radius_widened = bool(results)

    results.sort(key=lambda r: r["distance_km"])
    return Response({"results": results, "radius_widened": radius_widened})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_pharmacies(request):
    """Every pharmacy in the catalog, unfiltered by radius -- for a full
    directory view. lat/lng are optional; when given, each result carries
    its real distance and 'distance'/'radius_km' become usable.

    Query params: q (name/address search), area (exact match, see
    pharmacies.locations.AHMEDABAD_AREAS), sort (name|distance|rating),
    open_now, is_24_7, has_generic (all "true"/"1"), min_rating (float),
    radius_km (requires lat/lng). All filters are computed against real
    stored data -- opening hours, actual generic stock, actual reviews --
    never a decorative badge.
    """
    lat = request.GET.get("lat")
    lng = request.GET.get("lng")
    sort = request.GET.get("sort", "name")
    q = request.GET.get("q", "").strip()
    area = request.GET.get("area", "").strip()
    radius_km = request.GET.get("radius_km")

    has_coords = bool(lat and lng)
    if has_coords:
        lat, lng = float(lat), float(lng)

    queryset = _rated_pharmacies_queryset()
    if area:
        queryset = queryset.filter(area__iexact=area)
    if q:
        queryset = queryset.filter(Q(name__icontains=q) | Q(address__icontains=q))
    if request.GET.get("is_24_7", "").lower() in ("true", "1"):
        queryset = queryset.filter(is_24_7=True)
    if request.GET.get("has_generic", "").lower() in ("true", "1"):
        queryset = queryset.filter(_has_generic_stock=True)
    min_rating = request.GET.get("min_rating")
    if min_rating:
        queryset = queryset.filter(avg_rating__gte=float(min_rating))

    results = []
    for pharmacy in queryset:
        data = PharmacySerializer(pharmacy).data
        data["distance_km"] = round(haversine_km(lat, lng, pharmacy.lat, pharmacy.lng), 2) if has_coords else None
        results.append(data)

    if has_coords and radius_km:
        radius_km = float(radius_km)
        results = [r for r in results if r["distance_km"] <= radius_km]

    if request.GET.get("open_now", "").lower() in ("true", "1"):
        results = [r for r in results if r["is_open"]]

    if sort == "distance" and has_coords:
        results.sort(key=lambda r: r["distance_km"])
    elif sort == "rating":
        results.sort(key=lambda r: (r["avg_rating"] is None, -(r["avg_rating"] or 0)))
    else:
        results.sort(key=lambda r: r["name"].lower())

    return Response({"results": results})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pharmacy_medicines(request, pharmacy_id):
    """Real, currently in-stock medicines at one pharmacy, price-ascending --
    backs the directory page's 'View Medicines' action."""
    pharmacy = get_object_or_404(Pharmacy, pk=pharmacy_id)
    stocks = (
        MedicineStock.objects.filter(pharmacy=pharmacy, quantity__gt=0)
        .select_related("medicine", "medicine__salt")
        .order_by("price")
    )
    results = [
        {
            "stock_id": str(s.id),
            "medicine_id": str(s.medicine.id),
            "brand_name": s.medicine.brand_name,
            "salt_name": s.medicine.salt.name,
            "manufacturer": s.medicine.manufacturer,
            "is_generic": s.medicine.is_generic,
            "strength": s.medicine.strength,
            "price": float(s.price),
            "quantity": s.quantity,
        }
        for s in stocks
    ]
    return Response({"pharmacy_name": pharmacy.name, "results": results})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stock_price_history(request, stock_id):
    """Daily price history for one medicine at one pharmacy, plus a
    summary (min/max/current/change) for rendering a trend chart."""
    stock = get_object_or_404(
        MedicineStock.objects.select_related("medicine", "pharmacy"), pk=stock_id
    )
    logs = PriceLog.objects.filter(stock=stock).order_by("recorded_at")
    history = [
        {"date": log.recorded_at.date().isoformat(), "price": float(log.price)}
        for log in logs
    ]

    prices = [point["price"] for point in history] or [float(stock.price)]
    change_pct = None
    if len(history) >= 2 and history[0]["price"]:
        change_pct = round(((prices[-1] - history[0]["price"]) / history[0]["price"]) * 100, 1)

    return Response(
        {
            "stock_id": str(stock.id),
            "medicine_name": stock.medicine.brand_name,
            "pharmacy_name": stock.pharmacy.name,
            "current_price": float(stock.price),
            "min_price": min(prices),
            "max_price": max(prices),
            "change_pct": change_pct,
            "history": history,
        }
    )


class PharmacyReviewViewSet(viewsets.ModelViewSet):
    """Reviews rate the pharmacy (service, wait times, stock accuracy) --
    never a medicine. One review per user per pharmacy; resubmitting
    updates it rather than creating a duplicate.
    """

    serializer_class = PharmacyReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        qs = PharmacyReview.objects.select_related("user")
        pharmacy_id = self.request.query_params.get("pharmacy")
        if pharmacy_id:
            qs = qs.filter(pharmacy_id=pharmacy_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review, _created = PharmacyReview.objects.update_or_create(
            pharmacy=serializer.validated_data["pharmacy"],
            user=request.user,
            defaults={
                "rating": serializer.validated_data["rating"],
                "comment": serializer.validated_data.get("comment", ""),
            },
        )
        return Response(PharmacyReviewSerializer(review).data, status=201)
