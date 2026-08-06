from rest_framework.routers import DefaultRouter

from .views import IncomingOrderViewSet

router = DefaultRouter()
router.register("", IncomingOrderViewSet, basename="incoming-order")

urlpatterns = router.urls
