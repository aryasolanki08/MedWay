from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count, F
from django.utils import timezone
from datetime import timedelta
from accounts.permissions import HasPharmacy
from billing.models import Bill, BillItem
from purchases.models import PurchaseBill
from inventory.models import Medicine

class AnalyticsOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPharmacy]

    def get(self, request, *args, **kwargs):
        pharmacy = request.user.staff_profile.pharmacy
        today = timezone.localdate()
        
        # 1. Total Sales Metrics
        sales_today = Bill.objects.filter(pharmacy=pharmacy, created_at__date=today).aggregate(total=Sum('total_amount'))['total'] or 0.0
        sales_week = Bill.objects.filter(pharmacy=pharmacy, created_at__date__gte=today - timedelta(days=7)).aggregate(total=Sum('total_amount'))['total'] or 0.0
        sales_month = Bill.objects.filter(pharmacy=pharmacy, created_at__date__gte=today - timedelta(days=30)).aggregate(total=Sum('total_amount'))['total'] or 0.0

        # 2. Total Purchases Metrics
        purchases_today = PurchaseBill.objects.filter(pharmacy=pharmacy, created_at__date=today).aggregate(total=Sum('total_amount'))['total'] or 0.0
        purchases_week = PurchaseBill.objects.filter(pharmacy=pharmacy, created_at__date__gte=today - timedelta(days=7)).aggregate(total=Sum('total_amount'))['total'] or 0.0
        purchases_month = PurchaseBill.objects.filter(pharmacy=pharmacy, created_at__date__gte=today - timedelta(days=30)).aggregate(total=Sum('total_amount'))['total'] or 0.0

        # 3. 30-Day Sales and Purchases Trend
        trend_data = []
        for i in range(29, -1, -1):
            day = today - timedelta(days=i)
            day_sales = Bill.objects.filter(pharmacy=pharmacy, created_at__date=day).aggregate(total=Sum('total_amount'))['total'] or 0.0
            day_purchases = PurchaseBill.objects.filter(pharmacy=pharmacy, created_at__date=day).aggregate(total=Sum('total_amount'))['total'] or 0.0
            trend_data.append({
                'date': day.strftime('%Y-%m-%d'),
                'sales': float(day_sales),
                'purchases': float(day_purchases)
            })

        # 4. Best Selling Medicines
        best_sellers_qs = BillItem.objects.filter(
            bill__pharmacy=pharmacy,
            bill__created_at__date__gte=today - timedelta(days=30)
        ).values(
            'medicine__name'
        ).annotate(
            quantity_sold=Sum('quantity'),
            total_revenue=Sum('subtotal')
        ).order_by('-quantity_sold')[:5]

        best_sellers = []
        for bs in best_sellers_qs:
            best_sellers.append({
                'name': bs['medicine__name'],
                'quantity_sold': bs['quantity_sold'],
                'total_revenue': float(bs['total_revenue'])
            })

        # 5. Inventory counts
        low_stock_count = Medicine.objects.filter(
            pharmacy=pharmacy,
            stock_quantity__gt=0,
            stock_quantity__lte=F('reorder_threshold')
        ).count()

        out_of_stock_count = Medicine.objects.filter(
            pharmacy=pharmacy,
            stock_quantity__lte=0
        ).count()

        return Response({
            'data': {
                'sales_today': float(sales_today),
                'sales_week': float(sales_week),
                'sales_month': float(sales_month),
                'purchases_today': float(purchases_today),
                'purchases_week': float(purchases_week),
                'purchases_month': float(purchases_month),
                'sales_trend': trend_data,
                'best_sellers': best_sellers,
                'low_stock_count': low_stock_count + out_of_stock_count,
                'out_of_stock_count': out_of_stock_count
            }
        })
