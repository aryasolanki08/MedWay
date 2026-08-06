import csv
import io
from datetime import datetime
from django.db import transaction
from django.db.models import ProtectedError
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status, viewsets
from accounts.permissions import PharmacyScopeMixin, HasPharmacy
from inventory.models import Medicine
from inventory.serializers import MedicineSerializer

class MedicineViewSet(PharmacyScopeMixin, viewsets.ModelViewSet):
    queryset = Medicine.objects.all()
    serializer_class = MedicineSerializer
    permission_classes = [HasPharmacy]

    def perform_create(self, serializer):
        pharmacy = self.request.user.staff_profile.pharmacy
        if pharmacy.subscription_tier == 'solo':
            current_count = Medicine.objects.filter(pharmacy=pharmacy).count()
            if current_count >= 150:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Inventory limit reached. Solo plan is limited to 150 items. Please upgrade to a premium plan.")
        super().perform_create(serializer)

    def perform_destroy(self, instance):
        # Medicine is referenced by PurchaseItem/BillItem with on_delete=PROTECT,
        # so any item that has ever been purchased-in or sold can't be hard-deleted
        # without breaking historical purchase/sales records. Surface that reason
        # instead of letting the ProtectedError bubble up as a bare 500.
        try:
            super().perform_destroy(instance)
        except ProtectedError:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "This medicine has purchase or sale history and can't be deleted, "
                "since that would erase those past records. Set its stock to 0 "
                "instead so it stops showing as available."
            )

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify it's a CSV
        if not file_obj.name.endswith('.csv'):
            return Response({'error': 'Please upload a CSV file.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            decoded_file = file_obj.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            return Response({'error': f'Failed to decode file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Standard headers
        required_headers = {'name', 'mrp', 'selling_price', 'purchase_price', 'stock_quantity', 'batch_number', 'expiry_date'}
        headers = set(reader.fieldnames or [])
        
        # Clean header spacing
        if reader.fieldnames:
            reader.fieldnames = [h.strip() for h in reader.fieldnames]
            headers = set(reader.fieldnames)
            
        if not required_headers.issubset(headers):
            missing = required_headers - headers
            return Response({
                'error': f'CSV is missing required columns: {", ".join(missing)}'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        pharmacy = request.user.staff_profile.pharmacy
        rows = list(reader)
        if pharmacy.subscription_tier == 'solo':
            current_count = Medicine.objects.filter(pharmacy=pharmacy).count()
            if current_count + len(rows) > 150:
                return Response({
                    'error': f'Import limit exceeded. Your Solo plan allows up to 150 items, but importing this file would result in {current_count + len(rows)} items. Please upgrade to a premium plan.'
                }, status=status.HTTP_400_BAD_REQUEST)

        imported_count = 0
        errors = []
        
        with transaction.atomic():
            for row_idx, row in enumerate(rows, start=1):
                try:
                    name = row.get('name', '').strip()
                    if not name:
                        raise ValueError("Name cannot be empty.")
                        
                    mrp = float(row.get('mrp', 0))
                    selling_price = float(row.get('selling_price', 0))
                    purchase_price = float(row.get('purchase_price', 0))
                    stock_quantity = int(row.get('stock_quantity', 0))
                    
                    batch_number = row.get('batch_number', '').strip()
                    if not batch_number:
                        raise ValueError("Batch number cannot be empty.")
                        
                    expiry_date_str = row.get('expiry_date', '').strip()
                    expiry_date = None
                    for date_format in ('%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y'):
                        try:
                            expiry_date = datetime.strptime(expiry_date_str, date_format).date()
                            break
                        except ValueError:
                            continue
                            
                    if not expiry_date:
                        raise ValueError(f"Invalid expiry date: {expiry_date_str}. Use YYYY-MM-DD or DD-MM-YYYY.")
                        
                    reorder_val = row.get('reorder_threshold', '10')
                    reorder_threshold = int(reorder_val.strip()) if (reorder_val and reorder_val.strip().isdigit()) else 10
                    
                    Medicine.objects.create(
                        pharmacy=pharmacy,
                        name=name,
                        salt_composition=row.get('salt_composition', '').strip(),
                        manufacturer=row.get('manufacturer', '').strip(),
                        category=row.get('category', '').strip(),
                        mrp=mrp,
                        selling_price=selling_price,
                        purchase_price=purchase_price,
                        stock_quantity=stock_quantity,
                        batch_number=batch_number,
                        expiry_date=expiry_date,
                        reorder_threshold=reorder_threshold
                    )
                    imported_count += 1
                except Exception as e:
                    errors.append(f"Row {row_idx}: {str(e)}")
                    
            if errors:
                transaction.set_rollback(True)
                return Response({
                    'error': 'Import failed due to parsing errors.',
                    'errors': errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        return Response({
            'success': f'Successfully imported {imported_count} medicines.'
        }, status=status.HTTP_201_CREATED)
