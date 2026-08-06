from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import nearby_pharmacies, all_pharmacies, pharmacy_medicines, stock_price_history, PharmacyReviewViewSet

router = DefaultRouter()
router.register("reviews", PharmacyReviewViewSet, basename="pharmacy-review")

urlpatterns = [
    path("nearby/", nearby_pharmacies, name="nearby-pharmacies"),
    path("all/", all_pharmacies, name="all-pharmacies"),
    path("<uuid:pharmacy_id>/medicines/", pharmacy_medicines, name="pharmacy-medicines"),
    path("stock/<uuid:stock_id>/price-history/", stock_price_history, name="stock-price-history"),
] + router.urls
