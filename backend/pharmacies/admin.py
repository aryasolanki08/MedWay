from django.contrib import admin
from django.core.exceptions import ValidationError

from medway.admin_csv import CSVImportAdminMixin
from .models import Pharmacy, MedicineStock, PriceLog, PharmacyReview


@admin.register(Pharmacy)
class PharmacyAdmin(admin.ModelAdmin):
    list_display = ["name", "address", "lat", "lng", "phone"]


@admin.register(MedicineStock)
class MedicineStockAdmin(admin.ModelAdmin):
    list_display = ["medicine", "pharmacy", "price", "quantity", "updated_at"]
    list_filter = ["pharmacy"]


@admin.register(PharmacyReview)
class PharmacyReviewAdmin(admin.ModelAdmin):
    list_display = ["pharmacy", "user", "rating", "created_at"]
    list_filter = ["pharmacy", "rating"]


@admin.register(PriceLog)
class PriceLogAdmin(CSVImportAdminMixin, admin.ModelAdmin):
    list_display = ["stock", "price", "recorded_at"]
    list_filter = ["stock__pharmacy"]

    def import_row(self, row):
        """Expects columns: id (optional), stock_id, price, recorded_at (optional).
        Matches backend/data/price_log.csv as exported.
        """
        stock_id = (row.get("stock_id") or row.get("stock") or "").strip()
        price = (row.get("price") or "").strip()
        if not stock_id:
            raise ValueError("missing 'stock_id'")
        if not price:
            raise ValueError("missing 'price'")

        try:
            stock = MedicineStock.objects.get(pk=stock_id)
        except (MedicineStock.DoesNotExist, ValueError, ValidationError):
            raise ValueError(f"MedicineStock '{stock_id}' not found")

        row_id = (row.get("id") or "").strip()
        defaults = {"stock": stock, "price": price}
        if row_id:
            obj, created = PriceLog.objects.update_or_create(id=row_id, defaults=defaults)
        else:
            obj = PriceLog.objects.create(**defaults)
            created = True

        # recorded_at has auto_now_add=True, so it's ignored on create()/
        # update_or_create() -- write it separately via .update(), which
        # bypasses auto_now_add, so historical timestamps from the CSV
        # are preserved instead of being overwritten with "now".
        recorded_at = (row.get("recorded_at") or "").strip()
        if recorded_at:
            PriceLog.objects.filter(pk=obj.pk).update(recorded_at=recorded_at)

        return created
