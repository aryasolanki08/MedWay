from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from catalog.models import Medicine
from medway.admin_csv import CSVImportAdminMixin
from .models import SearchHistory, SavedMedicine

User = get_user_model()


def _resolve_user(ref):
    """Accepts a user id (uuid/pk) or a username."""
    ref = (ref or "").strip()
    if not ref:
        raise ValueError("missing 'user'")
    try:
        return User.objects.get(pk=ref)
    except (User.DoesNotExist, ValueError, ValidationError):
        pass
    try:
        return User.objects.get(username=ref)
    except User.DoesNotExist:
        raise ValueError(f"user '{ref}' not found (tried id and username)")


def _resolve_medicine(ref):
    """Accepts a medicine id (uuid/pk) or an exact brand_name."""
    ref = (ref or "").strip()
    if not ref:
        raise ValueError("missing 'medicine'")
    try:
        return Medicine.objects.get(pk=ref)
    except (Medicine.DoesNotExist, ValueError, ValidationError):
        pass
    try:
        return Medicine.objects.get(brand_name=ref)
    except Medicine.DoesNotExist:
        raise ValueError(f"medicine '{ref}' not found (tried id and brand_name)")
    except Medicine.MultipleObjectsReturned:
        raise ValueError(f"medicine '{ref}' matches more than one brand_name, use its id instead")


@admin.register(SearchHistory)
class SearchHistoryAdmin(CSVImportAdminMixin, admin.ModelAdmin):
    list_display = ["query", "user", "searched_at"]
    list_filter = ["user"]
    search_fields = ["query", "user__username"]

    def import_row(self, row):
        """Expects columns: id (optional), user (id or username), query, searched_at (optional)."""
        user = _resolve_user(row.get("user") or row.get("user_id") or row.get("username"))
        query = (row.get("query") or "").strip()
        if not query:
            raise ValueError("missing 'query'")

        row_id = (row.get("id") or "").strip()
        defaults = {"user": user, "query": query}
        if row_id:
            obj, created = SearchHistory.objects.update_or_create(id=row_id, defaults=defaults)
        else:
            obj = SearchHistory.objects.create(**defaults)
            created = True

        # searched_at has auto_now_add=True; write it separately via .update()
        # so historical timestamps from the CSV survive instead of being
        # overwritten with "now".
        searched_at = (row.get("searched_at") or "").strip()
        if searched_at:
            SearchHistory.objects.filter(pk=obj.pk).update(searched_at=searched_at)

        return created


@admin.register(SavedMedicine)
class SavedMedicineAdmin(CSVImportAdminMixin, admin.ModelAdmin):
    list_display = ["medicine", "user", "saved_at"]
    list_filter = ["user"]
    search_fields = ["medicine__brand_name", "user__username"]

    def import_row(self, row):
        """Expects columns: id (optional), user (id or username),
        medicine (id or brand_name), saved_at (optional).
        """
        user = _resolve_user(row.get("user") or row.get("user_id") or row.get("username"))
        medicine = _resolve_medicine(row.get("medicine") or row.get("medicine_id") or row.get("brand_name"))

        obj, created = SavedMedicine.objects.update_or_create(user=user, medicine=medicine)

        # saved_at has auto_now_add=True; same .update() trick as above.
        saved_at = (row.get("saved_at") or "").strip()
        if saved_at:
            SavedMedicine.objects.filter(pk=obj.pk).update(saved_at=saved_at)

        return created
