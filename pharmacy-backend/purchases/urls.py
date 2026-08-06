from django.urls import path, include
from rest_framework.routers import DefaultRouter
from purchases.views import PurchaseBillViewSet

router = DefaultRouter()
router.register(r'purchases', PurchaseBillViewSet, basename='purchase')

urlpatterns = [
    path('', include(router.urls)),
]
