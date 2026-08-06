from django.contrib import admin
from inventory.models import Medicine

@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ('id', 'pharmacy', 'name', 'batch_number', 'mrp', 'selling_price', 'stock_quantity', 'expiry_date', 'reorder_threshold')
    search_fields = ('name', 'salt_composition', 'batch_number', 'manufacturer')
    list_filter = ('pharmacy', 'expiry_date', 'category')
