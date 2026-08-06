from django.db import models
from accounts.models import Pharmacy, StaffUser
from inventory.models import Medicine

class Bill(models.Model):
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='bills')
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    customer_phone = models.CharField(max_length=20, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_by = models.ForeignKey(StaffUser, on_delete=models.SET_NULL, null=True, related_name='bills_created')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bill #{self.id} - {self.pharmacy.name}"

class BillItem(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name='bill_items')
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.medicine.name} x {self.quantity} on Bill #{self.bill.id}"
