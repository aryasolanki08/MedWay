from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .google_auth import GoogleTokenError, get_or_create_google_user, verify_google_token
from .serializers import RegisterSerializer, UserProfileSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserProfileSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=201,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def google_login(request):
    """Real Google sign-in: verifies the ID token from Google Identity
    Services (signature + audience + issuer, via google-auth), then
    finds-or-creates the matching account and issues our own JWT pair --
    same response shape as /register/ and /login/, so the frontend treats
    it identically either way.
    """
    credential = request.data.get("credential")
    if not credential:
        return Response({"detail": "credential is required"}, status=400)

    try:
        payload = verify_google_token(credential)
    except GoogleTokenError as e:
        return Response({"detail": str(e)}, status=400)

    user, created = get_or_create_google_user(payload)
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "user": UserProfileSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "created": created,
        },
        status=201 if created else 200,
    )
