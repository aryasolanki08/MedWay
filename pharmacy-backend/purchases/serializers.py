from rest_framework import serializers
from django.db import transaction
from purchases.models import PurchaseBill, PurchaseItem
from inventory.models import Medicine
from inventory.serializers import MedicineSerializer

class PurchaseItemSerializer(serializers.ModelSerializer):
    medicine_id = serializers.PrimaryKeyRelatedField(
        queryset=Medicine.objects.all(), source='medicine'
    )
    medicine = MedicineSerializer(read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ('id', 'medicine_id', 'medicine', 'quantity', 'unit_cost')

class PurchaseBillSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    items = PurchaseItemSerializer(many=True)
    pharmacy = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PurchaseBill
        fields = ('id', 'pharmacy', 'distributor_name', 'total_amount', 'items', 'created_at')
        read_only_fields = ('id', 'pharmacy', 'created_at')

    def get_id(self, obj):
        seq_map = self.context.get('seq_map')
        if seq_map and obj.id in seq_map:
            return seq_map[obj.id]
        if obj.id is None:
            return None
        return PurchaseBill.objects.filter(pharmacy=obj.pharmacy, id__lte=obj.id).count()

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        with transaction.atomic():
            purchase_bill = PurchaseBill.objects.create(**validated_data)
            
            for item_data in items_data:
                medicine = item_data['medicine']
                quantity = item_data['quantity']
                unit_cost = item_data['unit_cost']
                
                # Increase inventory levels and update purchase cost
                medicine.stock_quantity += quantity
                medicine.purchase_price = unit_cost
                medicine.save()
                
                PurchaseItem.objects.create(purchase_bill=purchase_bill, **item_data)
                
            return purchase_bill
