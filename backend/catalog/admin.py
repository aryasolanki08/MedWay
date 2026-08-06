from django.contrib import admin
from .models import Salt, Medicine


@admin.register(Salt)
class SaltAdmin(admin.ModelAdmin):
    list_display = ["name", "category"]
    search_fields = ["name"]


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ["brand_name", "salt", "is_generic", "manufacturer", "strength"]
    list_filter = ["is_generic", "form"]
    search_fields = ["brand_name", "salt__name"]
