"""Reusable 'Import CSV' button for Django admin changelist pages.

Usage:

    class MyModelAdmin(CSVImportAdminMixin, admin.ModelAdmin):
        def import_row(self, row: dict) -> bool:
            # row is a dict keyed by CSV header (from csv.DictReader).
            # Create/update your model instance here.
            # Return True if a new row was created, False if updated.
            ...

Raise ValueError(msg) inside import_row to skip a bad row without
aborting the rest of the import -- it will show up in the summary message.
"""
import csv
import io

from django import forms
from django.contrib import messages
from django.shortcuts import redirect, render
from django.urls import path

MAX_DISPLAYED_ERRORS = 20


class CSVImportForm(forms.Form):
    csv_file = forms.FileField(label="CSV file")


class CSVImportAdminMixin:
    """Mixin for ModelAdmin that adds an 'Import CSV' button + upload page."""

    change_list_template = "admin/csv_import_change_list.html"
    csv_import_template = "admin/csv_import_form.html"

    def get_urls(self):
        urls = super().get_urls()
        opts = self.model._meta
        custom = [
            path(
                "import-csv/",
                self.admin_site.admin_view(self.import_csv_view),
                name=f"{opts.app_label}_{opts.model_name}_import_csv",
            ),
        ]
        # Custom URL must come before Django's default urls so it isn't
        # shadowed by e.g. the change-view's "<path:object_id>/" pattern.
        return custom + urls

    def import_row(self, row):
        """Override in subclass. Return True if created, False if updated."""
        raise NotImplementedError("Implement import_row() on your ModelAdmin")

    def import_csv_view(self, request):
        opts = self.model._meta

        if request.method == "POST":
            form = CSVImportForm(request.POST, request.FILES)
            if form.is_valid():
                upload = form.cleaned_data["csv_file"]

                if not upload.name.lower().endswith(".csv"):
                    messages.error(request, "Please upload a .csv file.")
                    return redirect(f"admin:{opts.app_label}_{opts.model_name}_changelist")

                try:
                    decoded = upload.read().decode("utf-8-sig")
                except UnicodeDecodeError:
                    messages.error(request, "Could not read file -- please save it as UTF-8 CSV.")
                    return redirect(f"admin:{opts.app_label}_{opts.model_name}_changelist")

                reader = csv.DictReader(io.StringIO(decoded))
                if not reader.fieldnames:
                    messages.error(request, "CSV has no header row.")
                    return redirect(f"admin:{opts.app_label}_{opts.model_name}_changelist")

                created = updated = 0
                errors = []
                for i, row in enumerate(reader, start=2):  # row 1 is the header
                    try:
                        was_created = self.import_row(row)
                        if was_created:
                            created += 1
                        else:
                            updated += 1
                    except Exception as exc:  # noqa: BLE001 -- surfaced to the admin user
                        if len(errors) < MAX_DISPLAYED_ERRORS:
                            errors.append(f"Row {i}: {exc}")

                if created or updated:
                    messages.success(request, f"Import finished: {created} created, {updated} updated.")
                if errors:
                    extra = "" if len(errors) < MAX_DISPLAYED_ERRORS else f" (showing first {MAX_DISPLAYED_ERRORS})"
                    messages.warning(request, f"{len(errors)} row(s) skipped{extra}: " + " | ".join(errors))
                if not (created or updated or errors):
                    messages.warning(request, "CSV had no data rows.")

                return redirect(f"admin:{opts.app_label}_{opts.model_name}_changelist")
        else:
            form = CSVImportForm()

        context = {
            **self.admin_site.each_context(request),
            "form": form,
            "opts": opts,
            "title": f"Import {opts.verbose_name_plural} from CSV",
        }
        return render(request, self.csv_import_template, context)
