from django.utils import timezone
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from accounts.models import APIKey


class HasValidAPIKey(permissions.BasePermission):
    """
    Grants access to requests carrying a valid, active API key in the
    'X-API-Key' header. Used for server-to-server integration endpoints
    (e.g. the customer portal registering pharmacy/medicine data), which
    are not authenticated via JWT/user login.
    """
    message = 'A valid API key is required (send it in the X-API-Key header).'

    def has_permission(self, request, view):
        api_key = request.headers.get('X-API-Key') or request.META.get('HTTP_X_API_KEY')
        if not api_key:
            return False
        try:
            key_obj = APIKey.objects.get(key=api_key, is_active=True)
        except APIKey.DoesNotExist:
            return False

        # Stash on the request so the view can reference it if needed, and
        # record usage without blocking the request on failure.
        request.api_key = key_obj
        APIKey.objects.filter(pk=key_obj.pk).update(last_used_at=timezone.now())
        return True

class HasPharmacy(permissions.BasePermission):
    """
    Ensure the user is associated with a pharmacy (has a StaffUser profile).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Django superusers without a staff profile are allowed for admin purposes
        if request.user.is_superuser:
            return True
            
        try:
            return request.user.staff_profile is not None
        except Exception:
            return False

class IsPharmacyOwner(permissions.BasePermission):
    """
    Ensure the user is the owner of the pharmacy.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.staff_profile.role == 'owner'
        except Exception:
            return False

class PharmacyScopeMixin:
    """
    Mixin to automatically scope querysets to the logged-in user's pharmacy.
    """
    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication credentials were not provided.")
        
        # If user is a superuser and doesn't have a pharmacy profile, return all data
        if user.is_superuser:
            try:
                if user.staff_profile:
                    return super().get_queryset().filter(pharmacy=user.staff_profile.pharmacy)
            except Exception:
                return super().get_queryset()
                
        try:
            profile = user.staff_profile
            return super().get_queryset().filter(pharmacy=profile.pharmacy)
        except Exception:
            raise PermissionDenied("You are not associated with any pharmacy.")

    def perform_create(self, serializer):
        # Automatically assign the pharmacy to the created object
        user = self.request.user
        if user.is_superuser:
            try:
                pharmacy = user.staff_profile.pharmacy
            except Exception:
                # If superuser with no pharmacy, require pharmacy in the payload
                serializer.save()
                return
        else:
            pharmacy = user.staff_profile.pharmacy
            
        serializer.save(pharmacy=pharmacy)
