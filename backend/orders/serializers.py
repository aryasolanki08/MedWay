from rest_framework import serializers

from pharmacies.models import MedicineStock, Pharmacy
from pharmacies.serializers import PharmacySerializer

from .models import Order, OrderItem


class OrderItemInputSerializer(serializers.Serializer):
    stock = serializers.PrimaryKeyRelatedField(queryset=MedicineStock.objects.all())
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "medicine_name", "salt_name", "quantity", "unit_price"]


class OrderSerializer(serializers.ModelSerializer):
    pharmacy_detail = PharmacySerializer(source="pharmacy", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "pharmacy", "pharmacy_detail", "delivery_address", "delivery_phone",
            "total_amount", "status", "items", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "pharmacy_detail", "total_amount", "status", "items", "created_at", "updated_at"]


class OrderCreateSerializer(serializers.Serializer):
    """Validates and prices a cart server-side -- the client only ever
    sends stock ids and quantities, never a price (mirrors
    customer.serializers.ReservationSerializer's trust model)."""

    pharmacy = serializers.PrimaryKeyRelatedField(queryset=Pharmacy.objects.all())
    delivery_address = serializers.CharField()
    delivery_phone = serializers.CharField(max_length=20)
    items = OrderItemInputSerializer(many=True)

    def validate(self, attrs):
        if not attrs["items"]:
            raise serializers.ValidationError({"items": "Cart is empty."})
        pharmacy = attrs["pharmacy"]
        for item in attrs["items"]:
            stock = item["stock"]
            if stock.pharmacy_id != pharmacy.id:
                raise serializers.ValidationError(
                    {"items": f"{stock.medicine.brand_name} is not stocked at the selected pharmacy."}
                )
            if item["quantity"] > stock.quantity:
                raise serializers.ValidationError(
                    {"items": f"Only {stock.quantity} of {stock.medicine.brand_name} in stock."}
                )
        return attrs
