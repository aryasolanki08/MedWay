from django.db import transaction
from rest_framework import serializers

from catalog.serializers import MedicineSerializer
from pharmacies.serializers import MedicineStockSerializer
from pharmacies.models import MedicineStock
from pharmacies.utils import price_trend_for_medicine
from .models import SearchHistory, SavedMedicine, Reservation


class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = ["id", "query", "searched_at"]
        read_only_fields = ["id", "searched_at"]


class SavedMedicineSerializer(serializers.ModelSerializer):
    medicine_detail = MedicineSerializer(source="medicine", read_only=True)
    price_trend = serializers.SerializerMethodField()

    class Meta:
        model = SavedMedicine
        fields = ["id", "medicine", "medicine_detail", "saved_at", "price_trend"]
        read_only_fields = ["id", "saved_at"]

    def get_price_trend(self, obj):
        return price_trend_for_medicine(obj.medicine)


class ReservationSerializer(serializers.ModelSerializer):
    stock_detail = MedicineStockSerializer(source="stock", read_only=True)
    stock = serializers.PrimaryKeyRelatedField(queryset=MedicineStock.objects.all(), write_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id", "stock", "stock_detail", "quantity", "reserved_price",
            "pickup_code", "status", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "reserved_price", "pickup_code", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        stock = attrs["stock"]
        quantity = attrs.get("quantity", 1)
        if quantity < 1:
            raise serializers.ValidationError({"quantity": "Must reserve at least 1."})
        if quantity > stock.quantity:
            raise serializers.ValidationError(
                {"quantity": f"Only {stock.quantity} in stock at {stock.pharmacy.name}."}
            )
        return attrs

    def create(self, validated_data):
        quantity = validated_data.get("quantity", 1)
        with transaction.atomic():
            stock = MedicineStock.objects.select_for_update().get(pk=validated_data["stock"].pk)
            if quantity > stock.quantity:
                raise serializers.ValidationError(
                    {"quantity": f"Only {stock.quantity} in stock at {stock.pharmacy.name}."}
                )
            reservation = Reservation.objects.create(
                user=self.context["request"].user,
                stock=stock,
                quantity=quantity,
                reserved_price=stock.price,
            )
            stock.quantity -= quantity
            stock.save(update_fields=["quantity"])
        return reservation
