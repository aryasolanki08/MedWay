from rest_framework import serializers

from .models import Salt, Medicine


class SaltSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salt
        fields = ["id", "name", "category"]


class MedicineSerializer(serializers.ModelSerializer):
    salt_name = serializers.CharField(source="salt.name", read_only=True)

    class Meta:
        model = Medicine
        fields = [
            "id", "salt", "salt_name", "brand_name", "manufacturer",
            "is_generic", "strength", "form",
        ]
