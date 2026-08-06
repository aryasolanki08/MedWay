from django.contrib import admin
from billing.models import Bill, BillItem

class BillItemInline(admin.TabularInline):
    model = BillItem
    extra = 0

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('id', 'pharmacy', 'customer_name', 'total_amount', 'discount', 'created_by', 'created_at')
    search_fields = ('customer_name', 'customer_phone')
    list_filter = ('pharmacy', 'created_at')
    inlines = [BillItemInline]
