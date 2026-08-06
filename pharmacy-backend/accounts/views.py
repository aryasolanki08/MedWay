from rest_framework import status, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction
from django.contrib.auth.models import User
from django.utils.text import slugify
from accounts.models import Pharmacy, StaffUser, APIKey
from accounts.serializers import (
    SignupSerializer,
    StaffUserSerializer,
    PharmacySerializer,
    StaffCreateSerializer,
    APIKeySerializer,
    GooglePharmacySignupSerializer,
)
from accounts.permissions import HasPharmacy, IsPharmacyOwner, HasValidAPIKey
from accounts.google_auth import GoogleTokenError, verify_google_token, unique_username_from_email
from accounts.locations import DEFAULT_CITY, DEFAULT_STATE
from inventory.models import Medicine
import uuid
import razorpay
from django.conf import settings

class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleAuthView(APIView):
    """Handles both "Sign in with Google" and "Sign up with Google" behind
    one endpoint, matched by whether a StaffUser is already linked to the
    token's Google subject:

    - credential only, google_sub already linked -> log in (issue tokens).
    - credential only, no account linked yet -> 200 with
      {"signup_required": true, "email", "name"} so the frontend can show
      the pharmacy-details half of the signup form (username/password
      aren't needed -- identity comes from Google) without creating
      anything yet.
    - credential + pharmacy fields, no account linked yet -> create the
      User (unusable password -- Google-only login), Pharmacy, and owner
      StaffUser with google_sub set, then log in.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        credential = request.data.get('credential')
        if not credential:
            return Response({'detail': 'credential is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = verify_google_token(credential)
        except GoogleTokenError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        sub = payload['sub']
        email = payload.get('email', '')

        staff = StaffUser.objects.filter(google_sub=sub).first()
        if staff:
            return self._issue_tokens(staff.user, created=False)

        pharmacy_fields = {
            key: request.data.get(key)
            for key in ('pharmacy_name', 'license_number', 'address', 'phone', 'pharmacy_email', 'area', 'city', 'state')
        }
        if not any(pharmacy_fields.values()):
            return Response({
                'signup_required': True,
                'email': email,
                'name': payload.get('name', ''),
            }, status=status.HTTP_200_OK)

        serializer = GooglePharmacySignupSerializer(data=pharmacy_fields)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        with transaction.atomic():
            user = User.objects.create(
                username=unique_username_from_email(email),
                email=email,
                first_name=(payload.get('given_name') or '')[:150],
                last_name=(payload.get('family_name') or '')[:150],
            )
            user.set_unusable_password()
            user.save(update_fields=['password'])

            pharmacy = Pharmacy.objects.create(
                name=data['pharmacy_name'],
                license_number=data['license_number'],
                address=data['address'],
                phone=data['phone'],
                email=data['pharmacy_email'],
                city=data.get('city') or DEFAULT_CITY,
                state=data.get('state') or DEFAULT_STATE,
                area=data['area'],
                owner=user,
            )
            StaffUser.objects.create(user=user, pharmacy=pharmacy, role='owner', google_sub=sub)

        return self._issue_tokens(user, created=True)

    def _issue_tokens(self, user, created):
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': {'id': user.id, 'username': user.username, 'email': user.email},
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'created': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPharmacy]

    def get(self, request, *args, **kwargs):
        if request.user.is_superuser:
            try:
                profile = request.user.staff_profile
                serializer = StaffUserSerializer(profile)
                return Response(serializer.data)
            except Exception:
                return Response({
                    'id': None,
                    'user': {
                        'id': request.user.id,
                        'username': request.user.username,
                        'email': request.user.email
                    },
                    'pharmacy': None,
                    'role': 'admin'
                })
        
        profile = request.user.staff_profile
        serializer = StaffUserSerializer(profile)
        return Response(serializer.data)

class PharmacyViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasPharmacy]

    def list(self, request):
        # Return current user's pharmacy details
        pharmacy = request.user.staff_profile.pharmacy
        serializer = PharmacySerializer(pharmacy)
        return Response(serializer.data)

    def create(self, request):
        # Used as update (PUT) representation
        pharmacy = request.user.staff_profile.pharmacy
        if request.user.staff_profile.role != 'owner':
            return Response({'error': 'Only pharmacy owners can edit store settings.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = PharmacySerializer(pharmacy, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StaffUserViewSet(viewsets.ModelViewSet):
    serializer_class = StaffUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacyOwner]

    def get_queryset(self):
        pharmacy = self.request.user.staff_profile.pharmacy
        return StaffUser.objects.filter(pharmacy=pharmacy, role='staff')

    def create(self, request, *args, **kwargs):
        pharmacy = request.user.staff_profile.pharmacy
        
        # Enforce plan-based staff limits
        tier = pharmacy.subscription_tier
        if tier == 'solo':
            return Response(
                {'error': 'Staff accounts are not supported on the Solo plan. Please upgrade to a premium plan.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif tier == 'smart':
            current_staff_count = StaffUser.objects.filter(pharmacy=pharmacy, role='staff').count()
            if current_staff_count >= 5:
                return Response(
                    {'error': 'Staff account limit reached. Smart plan is limited to 5 staff accounts. Please upgrade to Clinic Network.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = StaffCreateSerializer(data=request.data, context={'pharmacy': pharmacy})
        if serializer.is_valid():
            staff = serializer.save()
            return Response(StaffUserSerializer(staff).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None, *args, **kwargs):
        pharmacy = request.user.staff_profile.pharmacy
        try:
            staff = StaffUser.objects.get(id=pk, pharmacy=pharmacy, role='staff')
            user_obj = staff.user
            with transaction.atomic():
                staff.delete()
                user_obj.delete()
            return Response({'success': 'Staff member deleted.'}, status=status.HTTP_200_OK)
        except StaffUser.DoesNotExist:
            return Response({'error': 'Staff user not found.'}, status=status.HTTP_404_NOT_FOUND)


class CreatePaymentOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPharmacy]

    def post(self, request, *args, **kwargs):
        plan = request.data.get('plan')
        if plan not in ['smart', 'clinic']:
            return Response({'error': 'Invalid plan selected.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = 320000 if plan == 'smart' else 730000  # Smart: ₹3200 (in paise), Clinic: ₹7300 (in paise)
        
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_placeholder_id')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', 'placeholder_secret')
        
        if not key_secret or key_id == 'rzp_test_placeholder_id' or key_secret == 'placeholder_secret':
            # Sandbox mock checkout bypass
            order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
            return Response({
                'order_id': order_id,
                'amount': amount,
                'currency': 'INR',
                'key_id': key_id,
                'is_mock': True
            })

        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            order_data = {
                'amount': amount,
                'currency': 'INR',
                'receipt': f"receipt_{uuid.uuid4().hex[:12]}",
                'payment_capture': 1
            }
            order = client.order.create(data=order_data)
            return Response({
                'order_id': order['id'],
                'amount': order['amount'],
                'currency': order['currency'],
                'key_id': key_id,
                'is_mock': False
            })
        except Exception as e:
            # Fallback sandbox order creation
            order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
            return Response({
                'order_id': order_id,
                'amount': amount,
                'currency': 'INR',
                'key_id': key_id,
                'is_mock': True
            })

class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPharmacy]

    def post(self, request, *args, **kwargs):
        data = request.data
        order_id = data.get('razorpay_order_id')
        payment_id = data.get('razorpay_payment_id')
        signature = data.get('razorpay_signature')
        plan = data.get('plan')

        if not all([order_id, payment_id, signature, plan]):
            return Response({'error': 'Missing required verification fields.'}, status=status.HTTP_400_BAD_REQUEST)
        
        is_mock = order_id.startswith('order_mock_')
        
        if not is_mock:
            key_id = getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_placeholder_id')
            key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', 'placeholder_secret')
            try:
                client = razorpay.Client(auth=(key_id, key_secret))
                client.utility.verify_payment_signature({
                    'razorpay_order_id': order_id,
                    'razorpay_payment_id': payment_id,
                    'razorpay_signature': signature
                })
            except Exception as e:
                return Response({'error': 'Payment verification signature check failed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Update the Pharmacy subscription tier
        pharmacy = request.user.staff_profile.pharmacy
        pharmacy.subscription_tier = plan
        pharmacy.razorpay_order_id = order_id
        pharmacy.razorpay_payment_id = payment_id
        pharmacy.razorpay_signature = signature
        pharmacy.save()

        return Response({
            'success': True,
            'plan': plan,
            'message': f'Subscription upgraded to {plan.capitalize()} tier successfully!'
        })


class APIKeyViewSet(viewsets.ViewSet):
    """
    Lets a pharmacy owner (or Django superuser) generate and manage API
    keys used by trusted external systems -- e.g. the customer-facing
    portal -- to push pharmacy/medicine data into this system via the
    /api/integration/ endpoints.
    """
    permission_classes = [permissions.IsAuthenticated, IsPharmacyOwner]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return APIKey.objects.all().order_by('-created_at')
        return APIKey.objects.filter(created_by=self.request.user).order_by('-created_at')

    def list(self, request):
        serializer = APIKeySerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def create(self, request):
        name = request.data.get('name') or 'Customer Portal Integration'
        api_key = APIKey.objects.create(name=name, created_by=request.user)
        serializer = APIKeySerializer(api_key)
        # Full key value is only ever returned here, at creation time.
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None, *args, **kwargs):
        try:
            api_key = self.get_queryset().get(pk=pk)
        except APIKey.DoesNotExist:
            return Response({'error': 'API key not found.'}, status=status.HTTP_404_NOT_FOUND)
        api_key.delete()
        return Response({'success': 'API key revoked.'}, status=status.HTTP_200_OK)


class IntegrationRegisterDataView(APIView):
    """
    Bulk-registration endpoint for trusted external systems (authenticated
    via the X-API-Key header, see accounts.permissions.HasValidAPIKey).

    Used by the customer-facing portal to register its (real-world)
    pharmacies and their medicines into this pharmacy portal's dummy
    dataset. Each pharmacy is matched on name + license_number; if no
    match exists, a new Pharmacy is created along with a placeholder
    owner account (login is disabled for these accounts -- they exist
    only so the data has an owner, consistent with existing models).

    Expected payload:
    {
      "pharmacies": [
        {
          "name": "City Medical Store",
          "license_number": "optional",
          "address": "optional",
          "phone": "optional",
          "email": "optional",
          "city": "optional, e.g. Ahmedabad",
          "state": "optional, e.g. Gujarat",
          "area": "optional, e.g. Vastrapur",
          "medicines": [
            {
              "name": "Paracetamol 500mg",
              "salt_composition": "optional",
              "manufacturer": "optional",
              "category": "optional",
              "mrp": 30.0,
              "selling_price": 28.0,
              "purchase_price": 20.0,
              "stock_quantity": 50,
              "batch_number": "optional",
              "expiry_date": "2027-01-01"
            }
          ]
        }
      ]
    }
    """
    permission_classes = [HasValidAPIKey]

    DEFAULT_EXPIRY_YEARS = 2
    DEFAULT_BATCH_NUMBER = 'EXTERNAL-IMPORT'

    def post(self, request, *args, **kwargs):
        payload = request.data.get('pharmacies')
        if not isinstance(payload, list) or not payload:
            return Response(
                {'error': "Request body must include a non-empty 'pharmacies' list."},
                status=status.HTTP_400_BAD_REQUEST
            )

        summary = {
            'pharmacies_created': 0,
            'pharmacies_updated': 0,
            'medicines_created': 0,
            'medicines_updated': 0,
            'errors': [],
        }

        for idx, pharmacy_data in enumerate(payload):
            name = (pharmacy_data.get('name') or '').strip()
            if not name:
                summary['errors'].append(f'pharmacies[{idx}]: missing required "name".')
                continue

            license_number = (pharmacy_data.get('license_number') or '').strip()

            try:
                with transaction.atomic():
                    pharmacy, created = self._get_or_create_pharmacy(name, license_number, pharmacy_data)
                    if created:
                        summary['pharmacies_created'] += 1
                    else:
                        summary['pharmacies_updated'] += 1

                    medicines = pharmacy_data.get('medicines') or []
                    for med_idx, med_data in enumerate(medicines):
                        med_name = (med_data.get('name') or '').strip()
                        if not med_name:
                            summary['errors'].append(
                                f'pharmacies[{idx}].medicines[{med_idx}]: missing required "name".'
                            )
                            continue
                        med_created = self._upsert_medicine(pharmacy, med_data)
                        if med_created:
                            summary['medicines_created'] += 1
                        else:
                            summary['medicines_updated'] += 1
            except Exception as exc:
                summary['errors'].append(f'pharmacies[{idx}] ("{name}"): {exc}')

        return Response(summary, status=status.HTTP_200_OK)

    def _get_or_create_pharmacy(self, name, license_number, pharmacy_data):
        lookup = {'name': name}
        if license_number:
            lookup['license_number'] = license_number

        pharmacy = Pharmacy.objects.filter(**lookup).first()
        if pharmacy:
            # Refresh contact details if provided, without clobbering
            # existing values with blanks.
            for field in ('address', 'phone', 'email', 'city', 'state', 'area'):
                value = pharmacy_data.get(field)
                if value:
                    setattr(pharmacy, field, value)
            pharmacy.save()
            return pharmacy, False

        owner = self._create_placeholder_owner(name)
        pharmacy = Pharmacy.objects.create(
            name=name,
            license_number=license_number or f'EXT-{uuid.uuid4().hex[:10].upper()}',
            address=pharmacy_data.get('address', ''),
            phone=pharmacy_data.get('phone', ''),
            email=pharmacy_data.get('email', ''),
            city=pharmacy_data.get('city', ''),
            state=pharmacy_data.get('state', ''),
            area=pharmacy_data.get('area', ''),
            owner=owner,
        )
        StaffUser.objects.create(user=owner, pharmacy=pharmacy, role='owner')
        return pharmacy, True

    def _create_placeholder_owner(self, pharmacy_name):
        base_username = slugify(pharmacy_name)[:120] or 'external-pharmacy'
        username = f'{base_username}-{uuid.uuid4().hex[:8]}'
        user = User.objects.create(username=username)
        user.set_unusable_password()  # ingestion-only account; no interactive login
        user.save()
        return user

    def _upsert_medicine(self, pharmacy, med_data):
        name = med_data.get('name').strip()
        batch_number = (med_data.get('batch_number') or self.DEFAULT_BATCH_NUMBER).strip()

        selling_price = med_data.get('selling_price')
        mrp = med_data.get('mrp', selling_price)
        purchase_price = med_data.get('purchase_price', selling_price)
        expiry_date = med_data.get('expiry_date')
        if not expiry_date:
            from datetime import date
            expiry_date = date(date.today().year + self.DEFAULT_EXPIRY_YEARS, date.today().month, date.today().day)

        medicine, created = Medicine.objects.update_or_create(
            pharmacy=pharmacy,
            name=name,
            batch_number=batch_number,
            defaults={
                'salt_composition': med_data.get('salt_composition', ''),
                'manufacturer': med_data.get('manufacturer', ''),
                'category': med_data.get('category', ''),
                'mrp': mrp or 0,
                'selling_price': selling_price or 0,
                'purchase_price': purchase_price or 0,
                'stock_quantity': med_data.get('stock_quantity', 0),
                'expiry_date': expiry_date,
                'reorder_threshold': med_data.get('reorder_threshold', 10),
            }
        )
        return created


class IntegrationExportDataView(APIView):
    """
    Read-only counterpart to IntegrationRegisterDataView: lets a trusted
    external system (the customer-facing portal) pull this portal's real
    pharmacy/medicine/stock data to populate its own read replica
    (pharmacies.MedicineStock / PriceLog), instead of pharmacies here
    duplicating data entry there. Authenticated the same way (X-API-Key).

    Response shape mirrors the register-data payload plus a stable
    `medicine_id` per line so the caller can detect price changes between
    syncs without guessing at identity from name+batch alone.
    """
    permission_classes = [HasValidAPIKey]

    def get(self, request, *args, **kwargs):
        pharmacies = []
        for pharmacy in Pharmacy.objects.all().order_by('name'):
            medicines = [
                {
                    'medicine_id': medicine.id,
                    'name': medicine.name,
                    'salt_composition': medicine.salt_composition,
                    'manufacturer': medicine.manufacturer,
                    'category': medicine.category,
                    'mrp': str(medicine.mrp),
                    'selling_price': str(medicine.selling_price),
                    'stock_quantity': medicine.stock_quantity,
                    'batch_number': medicine.batch_number,
                    'expiry_date': medicine.expiry_date.isoformat() if medicine.expiry_date else None,
                    'updated_at': medicine.updated_at.isoformat(),
                }
                for medicine in medicine_queryset_for(pharmacy)
            ]
            pharmacies.append({
                'pharmacy_id': pharmacy.id,
                'name': pharmacy.name,
                'license_number': pharmacy.license_number,
                'address': pharmacy.address,
                'phone': pharmacy.phone,
                'email': pharmacy.email,
                'city': pharmacy.city,
                'state': pharmacy.state,
                'area': pharmacy.area,
                'medicines': medicines,
            })

        return Response({'pharmacies': pharmacies}, status=status.HTTP_200_OK)


def medicine_queryset_for(pharmacy):
    return Medicine.objects.filter(pharmacy=pharmacy).order_by('name')
