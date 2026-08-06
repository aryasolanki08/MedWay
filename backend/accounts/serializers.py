from django.contrib.auth import get_user_model
from rest_framework import serializers

from pharmacies.locations import AHMEDABAD_AREAS, AREA_COORDINATES, DEFAULT_CITY, DEFAULT_STATE

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    area = serializers.ChoiceField(choices=AHMEDABAD_AREAS)

    class Meta:
        model = User
        fields = ["id", "username", "password", "phone", "email", "city", "state", "area"]
        extra_kwargs = {
            "city": {"required": False},
            "state": {"required": False},
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.setdefault("city", DEFAULT_CITY)
        validated_data.setdefault("state", DEFAULT_STATE)
        user = User(**validated_data)
        user.set_password(password)
        # Give every new account a real starting point on the map (used by
        # distance-sorted results/store locator) without a separate
        # geocode step -- see Profile.jsx for the manual-override flow.
        lat_lng = AREA_COORDINATES.get(validated_data.get("area"))
        if lat_lng:
            user.location_lat, user.location_lng = lat_lng
            user.location_label = f"{validated_data['area']}, {validated_data.get('city', DEFAULT_CITY)}"
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    area = serializers.ChoiceField(choices=AHMEDABAD_AREAS, required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "phone",
            "city", "state", "area",
            "location_lat", "location_lng", "location_label",
            "avoid_nsaids",
        ]
        read_only_fields = ["id", "username"]

    def update(self, instance, validated_data):
        new_area = validated_data.get("area")
        if new_area and new_area != instance.area and "location_lat" not in validated_data:
            # Re-center on the newly picked area unless the caller is also
            # explicitly setting a precise lat/lng in this same request
            # (the free-text geocode flow in Profile.jsx does that).
            lat_lng = AREA_COORDINATES.get(new_area)
            if lat_lng:
                validated_data["location_lat"], validated_data["location_lng"] = lat_lng
        return super().update(instance, validated_data)
