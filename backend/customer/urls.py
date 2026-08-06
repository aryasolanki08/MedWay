from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import SearchHistoryViewSet, SavedMedicineViewSet, ReservationViewSet, insights, notifications

router = DefaultRouter()
router.register("history", SearchHistoryViewSet, basename="history")
router.register("saved", SavedMedicineViewSet, basename="saved")
router.register("reservations", ReservationViewSet, basename="reservation")

urlpatterns = [
    path("insights/", insights, name="customer-insights"),
    path("notifications/", notifications, name="customer-notifications"),
] + router.urls
