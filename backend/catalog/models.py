"""
نماذج الكتالوج: الألعاب (Oyunlar) + المنتجات (Ürünler/Pinler) + مجموعات الأسعار.
مبني على docs/DATABASE_SCHEMA.md (أقسام د + هـ).
"""
from decimal import Decimal
from django.db import models

from core.models import Tenant


class Game(models.Model):
    """لعبة (Oyun) — تحتها منتجات/بينات."""

    class Status(models.TextChoices):
        ACTIVE = "active", "نشط"
        PASSIVE = "passive", "معطّل"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="games")
    name = models.CharField(max_length=120)
    image_url = models.CharField(max_length=300, blank=True, default="")
    dealer_note = models.CharField(max_length=255, blank=True, default="")  # Bayiye Açıklama
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    require_player_id = models.BooleanField(default=False)  # Zorunlu Oyuncu ID/GSM
    kurulu_sale = models.BooleanField(default=True)   # Kurulu Satış — بيع بالحزم المعرّفة
    toplu_sale = models.BooleanField(default=False)   # Toplu Satış — بيع بالكمية
    sms_template = models.TextField(blank=True, default="")  # Sms Şablonu
    sort_order = models.PositiveIntegerField(default=0)  # ترتيب العرض (drag & drop)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "games"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class PriceGroup(models.Model):
    """مجموعة أسعار (Fiyat Grubu) — كل وكيل ينتمي لمجموعة."""

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="price_groups")
    name = models.CharField(max_length=60)
    dollar_rate = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal("1"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "price_groups"

    def __str__(self):
        return f"مجموعة {self.name}"


class Product(models.Model):
    """منتج داخل لعبة (60 UC, 300 UC …)."""

    class Status(models.TextChoices):
        ACTIVE = "active", "نشط"
        PASSIVE = "passive", "معطّل"
        SALE_PAUSED = "sale_paused", "بيع موقوف مؤقتاً"

    class Execution(models.TextChoices):
        MANUAL = "manual", "يدوي"
        AUTO = "auto", "تلقائي"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="products")
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=120)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))  # Maliyet
    recommended_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))  # Tavsiye
    kupur = models.CharField(max_length=60, blank=True, default="")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    is_parcali = models.BooleanField(default=False)  # يُقسّم لطلبات فرعية
    execution_type = models.CharField(max_length=8, choices=Execution.choices, default=Execution.AUTO)
    description = models.CharField(max_length=255, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "products"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.game.name} — {self.name}"

    @property
    def profit(self) -> Decimal:
        """الربح المرجعي = السعر الموصى − التكلفة."""
        return self.recommended_price - self.cost_price
