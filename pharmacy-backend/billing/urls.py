from django.urls import path, include
from rest_framework.routers import DefaultRouter
from billing.views import BillViewSet

router = DefaultRouter()
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    path('', include(router.urls)),
]
