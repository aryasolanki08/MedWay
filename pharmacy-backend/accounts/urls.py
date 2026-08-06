from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from accounts.views import (
    SignupView,
    GoogleAuthView,
    MeView,
    PharmacyViewSet,
    StaffUserViewSet,
    CreatePaymentOrderView,
    VerifyPaymentView,
    APIKeyViewSet,
    IntegrationRegisterDataView,
    IntegrationExportDataView,
)
from orders.views import ReceiveOrderView

router = DefaultRouter()
router.register(r'pharmacy', PharmacyViewSet, basename='pharmacy')
router.register(r'staff', StaffUserViewSet, basename='staff')
router.register(r'api-keys', APIKeyViewSet, basename='api-key')

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('google/', GoogleAuthView.as_view(), name='google-auth'),
    path('me/', MeView.as_view(), name='me'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('payments/create-order/', CreatePaymentOrderView.as_view(), name='create-payment-order'),
    path('payments/verify-payment/', VerifyPaymentView.as_view(), name='verify-payment'),
    # Server-to-server integration (authenticated via X-API-Key, not JWT).
    path('integration/register-data/', IntegrationRegisterDataView.as_view(), name='integration-register-data'),
    path('integration/export-data/', IntegrationExportDataView.as_view(), name='integration-export-data'),
    path('integration/receive-order/', ReceiveOrderView.as_view(), name='integration-receive-order'),
    path('', include(router.urls)),
]
