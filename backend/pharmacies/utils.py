from datetime import timedelta
from math import radians, sin, cos, sqrt, atan2

from django.utils import timezone


def haversine_km(lat1, lng1, lat2, lng2):
    """Great-circle distance in kilometers between two lat/lng points."""
    R = 6371.0
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lng2 - lng1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return 2 * R * atan2(sqrt(a), sqrt(1 - a))


def is_open_now(pharmacy):
    """Real open/closed status computed from the pharmacy's actual stored
    hours (IST, since that's TIME_ZONE) -- never a hardcoded badge. Returns
    None if we don't have hours data for this pharmacy at all, so the
    frontend can distinguish 'known closed' from 'hours unknown'.
    """
    if pharmacy.is_24_7:
        return True
    if not pharmacy.opens_at or not pharmacy.closes_at:
        return None

    now = timezone.localtime().time()
    if pharmacy.opens_at <= pharmacy.closes_at:
        return pharmacy.opens_at <= now <= pharmacy.closes_at
    # Overnight hours (e.g. opens 20:00, closes 02:00) wrap past midnight.
    return now >= pharmacy.opens_at or now <= pharmacy.closes_at


def hours_label(pharmacy):
    if pharmacy.is_24_7:
        return "Open 24/7"
    if not pharmacy.opens_at or not pharmacy.closes_at:
        return None
    return f"{pharmacy.opens_at.strftime('%I:%M %p').lstrip('0')} - {pharmacy.closes_at.strftime('%I:%M %p').lstrip('0')}"


def price_trend_for_medicine(medicine, lookback_days=7):
    """Compares today's best (lowest) price for a medicine, across every
    pharmacy that stocks it, against the best price `lookback_days` ago.
    Used for saved-medicine price-drop badges -- not a per-pharmacy trend,
    since a shopper looking for savings cares about the best deal available,
    not one specific store's history.
    """
    from .models import MedicineStock, PriceLog  # local import avoids a circular import at module load

    stocks = list(MedicineStock.objects.filter(medicine=medicine))
    if not stocks:
        return None

    best_current = min(float(s.price) for s in stocks)

    cutoff = timezone.now() - timedelta(days=lookback_days)
    past_prices = []
    for stock in stocks:
        log = (
            PriceLog.objects.filter(stock=stock, recorded_at__lte=cutoff)
            .order_by("-recorded_at")
            .first()
        )
        if log:
            past_prices.append(float(log.price))

    if not past_prices:
        return {"best_current_price": round(best_current, 2), "change_pct": None, "trend": "flat"}

    best_past = min(past_prices)
    change_pct = round(((best_current - best_past) / best_past) * 100, 1)
    trend = "down" if change_pct <= -1 else ("up" if change_pct >= 1 else "flat")
    return {
        "best_current_price": round(best_current, 2),
        "best_price_days_ago": round(best_past, 2),
        "change_pct": change_pct,
        "trend": trend,
    }
