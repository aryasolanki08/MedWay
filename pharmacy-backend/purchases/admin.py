from django.contrib import admin
from purchases.models import PurchaseBill, PurchaseItem

class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0

@admin.register(PurchaseBill)
class PurchaseBillAdmin(admin.ModelAdmin):
    list_display = ('id', 'pharmacy', 'distributor_name', 'total_amount', 'created_at')
    search_fields = ('distributor_name',)
    list_filter = ('pharmacy', 'created_at')
    inlines = [PurchaseItemInline]
