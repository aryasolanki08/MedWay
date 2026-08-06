from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/pharmacies/", include("pharmacies.urls")),
    path("api/customer/", include("customer.urls")),
    path("api/customer/", include("orders.urls")),
    path("api/assistant/", include("assistant.urls")),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
