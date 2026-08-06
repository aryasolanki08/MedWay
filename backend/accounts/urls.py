from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView

from .views import RegisterView, ProfileView, google_login

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("google/", google_login, name="google-login"),
    path("profile/", ProfileView.as_view(), name="profile"),
]
