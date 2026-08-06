from rest_framework import serializers

from .models import Pharmacy, MedicineStock, PharmacyReview
from .utils import is_open_now, hours_label


class PharmacySerializer(serializers.ModelSerializer):
    # Populated via .annotate() on the queryset (avg_rating, review_count)
    # where available; falls back to None/0 for plain single-object fetches.
    avg_rating = serializers.FloatField(read_only=True, default=None)
    review_count = serializers.IntegerField(read_only=True, default=0)
    is_open = serializers.SerializerMethodField()
    hours_label = serializers.SerializerMethodField()
    has_generic_stock = serializers.SerializerMethodField()

    class Meta:
        model = Pharmacy
        fields = [
            "id", "name", "address", "city", "state", "area", "lat", "lng", "phone",
            "avg_rating", "review_count", "is_24_7", "is_open", "hours_label", "has_generic_stock",
        ]

    def get_is_open(self, obj):
        return is_open_now(obj)

    def get_hours_label(self, obj):
        return hours_label(obj)

    def get_has_generic_stock(self, obj):
        # Annotated on the queryset (see _rated_pharmacies_queryset) for one
        # query total; falls back to a per-object query otherwise.
        annotated = getattr(obj, "_has_generic_stock", None)
        if annotated is not None:
            return annotated
        return MedicineStock.objects.filter(
            pharmacy=obj, medicine__is_generic=True, quantity__gt=0
        ).exists()


class PharmacyReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = PharmacyReview
        fields = ["id", "pharmacy", "username", "rating", "comment", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"pharmacy": {"write_only": True}}


class MedicineStockSerializer(serializers.ModelSerializer):
    pharmacy = PharmacySerializer(read_only=True)
    medicine_name = serializers.CharField(source="medicine.brand_name", read_only=True)

    class Meta:
        model = MedicineStock
        fields = ["id", "medicine", "medicine_name", "pharmacy", "price", "quantity", "updated_at"]
