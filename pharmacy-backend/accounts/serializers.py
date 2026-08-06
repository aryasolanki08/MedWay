from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from accounts.models import Pharmacy, StaffUser, APIKey
from accounts.locations import AHMEDABAD_AREAS, DEFAULT_CITY, DEFAULT_STATE

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

class PharmacySerializer(serializers.ModelSerializer):
    class Meta:
        model = Pharmacy
        fields = ('id', 'name', 'license_number', 'address', 'phone', 'email', 'city', 'state', 'area', 'subscription_tier', 'created_at')

class StaffUserSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    pharmacy = PharmacySerializer(read_only=True)

    class Meta:
        model = StaffUser
        fields = ('id', 'user', 'pharmacy', 'role')

class SignupSerializer(serializers.Serializer):
    # User fields
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    # Pharmacy fields
    pharmacy_name = serializers.CharField(max_length=255)
    license_number = serializers.CharField(max_length=100)
    address = serializers.CharField(style={'base_template': 'textarea.html'})
    phone = serializers.CharField(max_length=20)
    pharmacy_email = serializers.EmailField()
    area = serializers.ChoiceField(choices=AHMEDABAD_AREAS)
    city = serializers.CharField(max_length=100, required=False)
    state = serializers.CharField(max_length=100, required=False)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            # Create User
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password']
            )

            # Create Pharmacy
            pharmacy = Pharmacy.objects.create(
                name=validated_data['pharmacy_name'],
                license_number=validated_data['license_number'],
                address=validated_data['address'],
                phone=validated_data['phone'],
                email=validated_data['pharmacy_email'],
                city=validated_data.get('city') or DEFAULT_CITY,
                state=validated_data.get('state') or DEFAULT_STATE,
                area=validated_data['area'],
                owner=user
            )

            # Create StaffUser as Owner
            StaffUser.objects.create(
                user=user,
                pharmacy=pharmacy,
                role='owner'
            )

            return user

class GooglePharmacySignupSerializer(serializers.Serializer):
    """Pharmacy-detail half of signup for the Google flow -- identity
    (username/email/password) comes from the verified Google token instead,
    see accounts.views.google_auth."""
    pharmacy_name = serializers.CharField(max_length=255)
    license_number = serializers.CharField(max_length=100)
    address = serializers.CharField(style={'base_template': 'textarea.html'})
    phone = serializers.CharField(max_length=20)
    pharmacy_email = serializers.EmailField()
    area = serializers.ChoiceField(choices=AHMEDABAD_AREAS)
    city = serializers.CharField(max_length=100, required=False)
    state = serializers.CharField(max_length=100, required=False)


class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ('id', 'key', 'name', 'is_active', 'created_at', 'last_used_at')
        read_only_fields = ('id', 'key', 'created_at', 'last_used_at')


class StaffCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        pharmacy = self.context['pharmacy']
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password']
            )
            staff_profile = StaffUser.objects.create(
                user=user,
                pharmacy=pharmacy,
                role='staff'
            )
            return staff_profile

