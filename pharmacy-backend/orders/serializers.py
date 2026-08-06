from rest_framework import serializers

from .models import IncomingOrder, IncomingOrderItem


class IncomingOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomingOrderItem
        fields = ["id", "medicine_name", "salt_name", "quantity", "unit_price"]


class IncomingOrderSerializer(serializers.ModelSerializer):
    items = IncomingOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = IncomingOrder
        fields = [
            "id", "customer_order_id", "customer_name", "customer_phone", "delivery_address",
            "total_amount", "status", "items", "bill", "created_at", "updated_at",
        ]
        read_only_fields = fields
