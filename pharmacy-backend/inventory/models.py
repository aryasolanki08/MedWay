from django.db import models
from accounts.models import Pharmacy

class Medicine(models.Model):
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='medicines')
    name = models.CharField(max_length=255)
    salt_composition = models.CharField(max_length=255, blank=True, default='')
    manufacturer = models.CharField(max_length=255, blank=True, default='')
    category = models.CharField(max_length=100, blank=True, default='')
    mrp = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    reorder_threshold = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (Batch: {self.batch_number})"
