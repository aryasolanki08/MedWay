from collections import Counter
from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response

from catalog.models import Medicine
from catalog.salt_resolution import resolve_salt
from orders.models import Order, OrderItem
from pharmacies.models import MedicineStock
from pharmacies.utils import price_trend_for_medicine
from .models import SearchHistory, SavedMedicine, Reservation
from .serializers import SearchHistorySerializer, SavedMedicineSerializer, ReservationSerializer


class SearchHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = SearchHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        return SearchHistory.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["delete"])
    def clear_all(self, request):
        deleted_count, _ = self.get_queryset().delete()
        return Response({"deleted": deleted_count})


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post"]

    def get_queryset(self):
        return Reservation.objects.filter(user=self.request.user).select_related(
            "stock__medicine", "stock__pharmacy"
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status != "pending":
            return Response({"detail": "Only pending reservations can be cancelled."}, status=400)
        with transaction.atomic():
            stock = MedicineStock.objects.select_for_update().get(pk=reservation.stock_id)
            stock.quantity += reservation.quantity
            stock.save(update_fields=["quantity"])
            reservation.status = "cancelled"
            reservation.save(update_fields=["status", "updated_at"])
        return Response(ReservationSerializer(reservation).data)

    @action(detail=True, methods=["post"])
    def mark_picked_up(self, request, pk=None):
        reservation = self.get_object()
        if reservation.status != "pending":
            return Response({"detail": "Only pending reservations can be marked picked up."}, status=400)
        reservation.status = "picked_up"
        reservation.save(update_fields=["status", "updated_at"])
        return Response(ReservationSerializer(reservation).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def notifications(request):
    """A live-computed feed, not a stored notification log -- price drops
    on saved medicines and pending-reservation reminders, derived fresh
    from current data each call so it's never stale or fabricated.
    """
    items = []

    saved = SavedMedicine.objects.filter(user=request.user).select_related("medicine")
    for s in saved:
        trend = price_trend_for_medicine(s.medicine)
        if trend and trend["trend"] == "down":
            items.append({
                "id": f"price-drop-{s.id}",
                "type": "price_drop",
                "title": f"{s.medicine.brand_name} price dropped",
                "body": f"Now ₹{trend['best_current_price']} (down {abs(trend['change_pct'])}% from last week).",
                "created_at": s.saved_at,
                "medicine_id": str(s.medicine.id),
            })

    pending = Reservation.objects.filter(user=request.user, status="pending").select_related(
        "stock__medicine", "stock__pharmacy"
    )
    for r in pending:
        items.append({
            "id": f"reservation-{r.id}",
            "type": "reservation",
            "title": f"{r.stock.medicine.brand_name} reserved",
            "body": f"Pickup code {r.pickup_code} at {r.stock.pharmacy.name} -- pending.",
            "created_at": r.created_at,
            "reservation_id": str(r.id),
        })

    items.sort(key=lambda i: i["created_at"], reverse=True)
    return Response({"count": len(items), "results": items})


def _parse_range(request):
    """Returns (start, end, prev_start, prev_end) as tz-aware datetimes for
    the requested range param -- '7d' (default 30d), '30d', 'ytd', or
    'custom' with ?start=YYYY-MM-DD&end=YYYY-MM-DD. prev_* is the
    immediately preceding period of the same length, used for the real
    period-over-period trend badge (never a guessed percentage).
    """
    range_key = request.GET.get("range", "30d")
    now = timezone.localtime()
    end = now

    if range_key == "custom":
        try:
            start_str = request.GET["start"]
            end_str = request.GET["end"]
            start = timezone.make_aware(datetime.combine(date.fromisoformat(start_str), time.min))
            end = timezone.make_aware(datetime.combine(date.fromisoformat(end_str), time.max))
        except (KeyError, ValueError):
            range_key = "30d"
            start = end - timedelta(days=30)
    elif range_key == "7d":
        start = end - timedelta(days=7)
    elif range_key == "ytd":
        start = timezone.make_aware(datetime.combine(date(now.year, 1, 1), time.min))
    else:
        range_key = "30d"
        start = end - timedelta(days=30)

    period_length = end - start
    prev_end = start
    prev_start = prev_end - period_length
    return start, end, prev_start, prev_end


def _generic_savings_for_queries(queries):
    """Real generic-vs-branded savings total for a set of search queries --
    same salt resolution + cheapest-price comparison used everywhere else,
    scoped to just the queries given (so it can be computed once for the
    current period and once for the previous period, for a real trend %)."""
    total = 0.0
    seen_salts = set()
    for query in queries:
        salt = resolve_salt(query)
        if not salt or salt.id in seen_salts:
            continue
        seen_salts.add(salt.id)
        prices = MedicineStock.objects.filter(medicine__salt=salt).select_related("medicine")
        branded_prices = [float(s.price) for s in prices if not s.medicine.is_generic]
        generic_prices = [float(s.price) for s in prices if s.medicine.is_generic]
        if branded_prices and generic_prices:
            diff = min(branded_prices) - min(generic_prices)
            if diff > 0:
                total += diff
    return round(total, 2)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def insights(request):
    """Search, savings, and real order-spend insights derived from the
    user's own history and their delivered orders (orders.Order) --
    nothing here is estimated or fabricated. Most-searched salts, category
    breakdown, the total the user could have saved by always picking the
    cheapest generic for what they searched, and real amount actually
    spent on orders that were delivered -- all scoped to a real,
    filterable date range, with a genuine period-over-period comparison
    for the trend badges.
    """
    start, end, prev_start, prev_end = _parse_range(request)

    qs = SearchHistory.objects.filter(user=request.user, searched_at__gte=start, searched_at__lte=end)
    history = list(qs.values_list("query", "searched_at"))
    saved_count = SavedMedicine.objects.filter(user=request.user).count()

    query_counts = Counter(q.strip().lower() for q, _ in history if q.strip())
    total_this_period = sum(query_counts.values())
    most_searched = [
        {"query": q, "count": c, "share_pct": round(c / total_this_period * 100) if total_this_period else 0}
        for q, c in query_counts.most_common(5)
    ]

    category_counts = Counter()
    for query, count in query_counts.items():
        salt = resolve_salt(query)
        if salt:
            category_counts[salt.category or "Other"] += count
    total_categorized = sum(category_counts.values())
    category_breakdown = [
        {"category": cat, "count": count, "share_pct": round(count / total_categorized * 100) if total_categorized else 0}
        for cat, count in category_counts.most_common()
    ]

    savings_this_period = _generic_savings_for_queries(query_counts.keys())

    prev_queries = set(
        q.strip().lower()
        for q in SearchHistory.objects.filter(
            user=request.user, searched_at__gte=prev_start, searched_at__lt=prev_end
        ).values_list("query", flat=True)
        if q.strip()
    )
    savings_prev_period = _generic_savings_for_queries(prev_queries) if prev_queries else 0.0
    savings_trend_pct = None
    if savings_prev_period > 0:
        savings_trend_pct = round((savings_this_period - savings_prev_period) / savings_prev_period * 100)

    # Daily search volume for the period's sparkline -- real counts per day,
    # not interpolated or smoothed.
    daily_counts = Counter(timezone.localtime(ts).date().isoformat() for _, ts in history)
    num_days = max((end.date() - start.date()).days, 1)
    daily_search_series = []
    for i in range(num_days + 1):
        day = (start + timedelta(days=i)).date()
        if day > end.date():
            break
        daily_search_series.append({"date": day.isoformat(), "count": daily_counts.get(day.isoformat(), 0)})

    # Same idea for medicines saved within the period -- real per-day counts.
    saved_in_range = SavedMedicine.objects.filter(
        user=request.user, saved_at__gte=start, saved_at__lte=end
    ).values_list("saved_at", flat=True)
    daily_saved_counts = Counter(timezone.localtime(ts).date().isoformat() for ts in saved_in_range)
    daily_saved_series = []
    for i in range(num_days + 1):
        day = (start + timedelta(days=i)).date()
        if day > end.date():
            break
        daily_saved_series.append({"date": day.isoformat(), "count": daily_saved_counts.get(day.isoformat(), 0)})

    # Real order spend -- scoped to DELIVERED orders only (an order that's
    # still pending/rejected/cancelled was never actually fulfilled, so it
    # isn't real spend yet), keyed off delivered_at (when the pharmacy
    # actually marked it delivered), not created_at.
    total_orders_placed = Order.objects.filter(
        user=request.user, created_at__gte=start, created_at__lte=end
    ).count()

    delivered_qs = Order.objects.filter(
        user=request.user, status="delivered", delivered_at__gte=start, delivered_at__lte=end
    )
    delivered_orders_count = delivered_qs.count()
    total_spent = round(float(sum((o.total_amount for o in delivered_qs), start=0)), 2)

    daily_spend_totals = Counter()
    for o in delivered_qs:
        daily_spend_totals[timezone.localtime(o.delivered_at).date().isoformat()] += float(o.total_amount)
    daily_spend_series = []
    for i in range(num_days + 1):
        day = (start + timedelta(days=i)).date()
        if day > end.date():
            break
        daily_spend_series.append({"date": day.isoformat(), "amount": round(daily_spend_totals.get(day.isoformat(), 0), 2)})

    prev_delivered_total = Order.objects.filter(
        user=request.user, status="delivered", delivered_at__gte=prev_start, delivered_at__lt=prev_end
    ).values_list("total_amount", flat=True)
    prev_spent = round(float(sum(prev_delivered_total, start=0)), 2)
    spend_trend_pct = None
    if prev_spent > 0:
        spend_trend_pct = round((total_spent - prev_spent) / prev_spent * 100)

    most_ordered_counts = Counter()
    for item in OrderItem.objects.filter(order__in=delivered_qs).values_list("medicine_name", "quantity"):
        most_ordered_counts[item[0]] += item[1]
    most_ordered = [
        {"medicine_name": name, "quantity": qty}
        for name, qty in most_ordered_counts.most_common(5)
    ]

    # Real top-searched-medicine -> real generic-switch savings recommendation.
    top_insight = None
    if most_searched:
        top = most_searched[0]
        salt = resolve_salt(top["query"])
        if salt:
            stocks = MedicineStock.objects.filter(medicine__salt=salt).select_related("medicine")
            branded = [s for s in stocks if not s.medicine.is_generic]
            generic = [s for s in stocks if s.medicine.is_generic]
            if branded and generic:
                cheapest_branded = min(branded, key=lambda s: s.price)
                cheapest_generic = min(generic, key=lambda s: s.price)
                diff = float(cheapest_branded.price) - float(cheapest_generic.price)
                if diff > 0:
                    top_insight = {
                        "top_query": top["query"],
                        "search_count": top["count"],
                        "salt_name": salt.name,
                        "generic_brand_name": cheapest_generic.medicine.brand_name,
                        "generic_strength": cheapest_generic.medicine.strength,
                        "savings_amount": round(diff, 2),
                    }

    return Response(
        {
            "range": request.GET.get("range", "30d"),
            "period_start": start.date().isoformat(),
            "period_end": end.date().isoformat(),
            "total_searches": len(history),
            "unique_queries_searched": len(query_counts),
            "saved_medicines_count": saved_count,
            "most_searched": most_searched,
            "category_breakdown": category_breakdown,
            "generic_savings_potential": savings_this_period,
            "generic_savings_trend_pct": savings_trend_pct,
            "daily_search_series": daily_search_series,
            "daily_saved_series": daily_saved_series,
            "top_insight": top_insight,
            "total_orders_placed": total_orders_placed,
            "delivered_orders_count": delivered_orders_count,
            "total_spent": total_spent,
            "spend_trend_pct": spend_trend_pct,
            "daily_spend_series": daily_spend_series,
            "most_ordered": most_ordered,
        }
    )


class SavedMedicineViewSet(viewsets.ModelViewSet):
    serializer_class = SavedMedicineSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        return SavedMedicine.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
