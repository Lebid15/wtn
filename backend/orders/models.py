"""
نماذج الطلبات (Takip): طلب شحن لعبة من وكيل، يُنفَّذ عبر مزوّد.
مبني على docs/DATABASE_SCHEMA.md (قسم و).
"""
from decimal import Decimal
from django.db import models

from core.models import Tenant, User
from catalog.models import Game, Product
from providers.models import Provider


class Order(models.Model):
    """طلب شحن (Oyun-Pin Takip)."""

    class Status(models.TextChoices):
        PENDING = "pending", "قيد الانتظار"
        PROCESSING = "processing", "قيد التنفيذ"
        SUCCESS = "success", "ناجح"
        CANCELLED = "cancelled", "ملغى"
        STUCK = "stuck", "عالق"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="orders")
    receipt_no = models.CharField(max_length=20, unique=True)  # Fiş No
    dealer = models.ForeignKey(User, on_delete=models.PROTECT, related_name="orders")
    game = models.ForeignKey(Game, on_delete=models.PROTECT, related_name="orders")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="orders")

    player_id = models.CharField(max_length=60, blank=True, default="")     # Oyuncu ID
    customer_phone = models.CharField(max_length=20, blank=True, default="")  # Müşteri Tel

    cost_price = models.DecimalField(max_digits=12, decimal_places=2)   # Alış
    sell_price = models.DecimalField(max_digits=12, decimal_places=2)   # Satış
    profit = models.DecimalField(max_digits=12, decimal_places=2)       # Kazanç

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    provider = models.ForeignKey(
        Provider, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    pin_result = models.CharField(max_length=255, blank=True, default="")   # PIN المسلّم
    api_response = models.CharField(max_length=255, blank=True, default="")  # رد الـ API
    dealer_note = models.CharField(max_length=255, blank=True, default="")

    balance_before = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    balance_after = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))

    created_at = models.DateTimeField(auto_now_add=True)   # İşlem Tarihi
    approved_at = models.DateTimeField(null=True, blank=True)  # Onay Tarihi

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"طلب {self.receipt_no} — {self.product.name} [{self.status}]"
