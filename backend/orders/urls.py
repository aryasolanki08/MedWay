from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import OrderViewSet, order_status_webhook

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")

urlpatterns = [
    path("orders/integration/status-update/", order_status_webhook, name="order-status-webhook"),
] + router.urls
