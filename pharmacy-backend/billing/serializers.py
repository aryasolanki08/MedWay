from rest_framework import serializers
from django.db import transaction
from billing.models import Bill, BillItem
from inventory.models import Medicine
from inventory.serializers import MedicineSerializer

class BillItemSerializer(serializers.ModelSerializer):
    medicine_id = serializers.PrimaryKeyRelatedField(
        queryset=Medicine.objects.all(), source='medicine'
    )
    medicine = MedicineSerializer(read_only=True)

    class Meta:
        model = BillItem
        fields = ('id', 'medicine_id', 'medicine', 'quantity', 'unit_price', 'subtotal')

class BillSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    items = BillItemSerializer(many=True)
    pharmacy = serializers.PrimaryKeyRelatedField(read_only=True)
    created_by_username = serializers.CharField(source='created_by.user.username', read_only=True)

    class Meta:
        model = Bill
        fields = (
            'id', 'pharmacy', 'customer_name', 'customer_phone', 
            'total_amount', 'discount', 'items', 'created_by_username', 
            'created_by', 'created_at'
        )
        read_only_fields = ('id', 'pharmacy', 'created_by', 'created_at')

    def get_id(self, obj):
        seq_map = self.context.get('seq_map')
        if seq_map and obj.id in seq_map:
            return seq_map[obj.id]
        if obj.id is None:
            return None
        return Bill.objects.filter(pharmacy=obj.pharmacy, id__lte=obj.id).count()

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Determine current user's profile
        request = self.context.get('request')
        created_by = None
        if request and request.user and not request.user.is_superuser:
            try:
                created_by = request.user.staff_profile
            except Exception:
                pass
                
        with transaction.atomic():
            bill = Bill.objects.create(created_by=created_by, **validated_data)
            
            for item_data in items_data:
                medicine = item_data['medicine']
                quantity = item_data['quantity']
                
                # Check stock availability
                if medicine.stock_quantity < quantity:
                    raise serializers.ValidationError({
                        'items': f"Insufficient stock for {medicine.name}. Available: {medicine.stock_quantity}, requested: {quantity}."
                    })
                
                # Deduct inventory quantity
                medicine.stock_quantity -= quantity
                medicine.save()
                
                BillItem.objects.create(bill=bill, **item_data)
                
            return bill
