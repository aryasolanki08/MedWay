from django.db import models
from accounts.models import Pharmacy
from inventory.models import Medicine

class PurchaseBill(models.Model):
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='purchases')
    distributor_name = models.CharField(max_length=255)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Purchase Bill #{self.id} from {self.distributor_name}"

class PurchaseItem(models.Model):
    purchase_bill = models.ForeignKey(PurchaseBill, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name='purchase_items')
    quantity = models.IntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.medicine.name} x {self.quantity} on Purchase #{self.purchase_bill.id}"
