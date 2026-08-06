from django.contrib import admin
from accounts.models import Pharmacy, StaffUser, APIKey

@admin.register(Pharmacy)
class PharmacyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'license_number', 'phone', 'email', 'owner', 'created_at')
    search_fields = ('name', 'license_number', 'email')
    list_filter = ('created_at',)

@admin.register(StaffUser)
class StaffUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'pharmacy', 'role')
    search_fields = ('user__username', 'pharmacy__name')
    list_filter = ('role',)

@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'key', 'created_by', 'is_active', 'created_at', 'last_used_at')
    search_fields = ('name', 'key', 'created_by__username')
    list_filter = ('is_active',)
