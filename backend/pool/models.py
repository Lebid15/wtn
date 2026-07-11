"""
نماذج بنك البينات (Havuz): تخزين مسبق للبينات المشتراة + تسليم تلقائي.
مبني على docs/DATABASE_SCHEMA.md (قسم ح).
"""
from decimal import Decimal
from django.db import models

from core.models import Tenant
from providers.models import Provider


class PinPool(models.Model):
    """مجموعة بينات (Havuz Grubu) — مرتبطة بمزوّد، تجمع بينات جاهزة للتسليم."""

    class Status(models.TextChoices):
        ACTIVE = "active", "نشط"
        PASSIVE = "passive", "معطّل"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="pin_pools")
    name = models.CharField(max_length=120)                 # Grup Adı
    description = models.CharField(max_length=255, blank=True, default="")  # Grup Açıklama
    provider = models.ForeignKey(                            # Bağlı Apisi
        Provider, null=True, blank=True, on_delete=models.SET_NULL, related_name="pools"
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pin_pools"
        ordering = ["id"]

    def __str__(self):
        return self.name


class Pin(models.Model):
    """بين مخزّن داخل مجموعة (كود جاهز للتسليم)."""

    class Status(models.TextChoices):
        AVAILABLE = "available", "متاح"
        RESERVED = "reserved", "محجوز"
        DELIVERED = "delivered", "مُسلّم"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="pins")
    pool = models.ForeignKey(PinPool, on_delete=models.CASCADE, related_name="pins")
    code = models.CharField(max_length=255)                 # كود البين
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.AVAILABLE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pins"

    def __str__(self):
        return f"بين {self.pool.name} [{self.status}]"
