from rest_framework import serializers
from inventory.models import Medicine

class MedicineSerializer(serializers.ModelSerializer):
    pharmacy = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Medicine
        fields = (
            'id', 'pharmacy', 'name', 'salt_composition', 'manufacturer', 
            'category', 'mrp', 'selling_price', 'purchase_price', 
            'stock_quantity', 'batch_number', 'expiry_date', 'reorder_threshold',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'pharmacy', 'created_at', 'updated_at')
