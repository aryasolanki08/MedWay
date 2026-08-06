from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from accounts.models import APIKey


class Command(BaseCommand):
    """Creates (or reuses) an active API key for server-to-server sync,
    e.g. the customer portal's `sync_pharmacy_data` management command
    pulling from /api/auth/integration/export-data/. Prints the key so it
    can be copied into the caller's .env."""

    help = "Create an integration API key for the customer-portal sync job and print it."

    def handle(self, *args, **options):
        existing = APIKey.objects.filter(name="customer-portal-sync", is_active=True).first()
        if existing:
            self.stdout.write(self.style.WARNING(f"Reusing existing key: {existing.key}"))
            return

        owner, _ = User.objects.get_or_create(
            username="integration-bot",
            defaults={"is_staff": False, "is_active": True},
        )
        if owner.has_usable_password() is False and owner.password == "":
            owner.set_unusable_password()
            owner.save()

        api_key = APIKey.objects.create(name="customer-portal-sync", created_by=owner)
        self.stdout.write(self.style.SUCCESS(f"Created integration API key: {api_key.key}"))
        self.stdout.write("Set this as PHARMACY_API_KEY in the customer backend's .env")
