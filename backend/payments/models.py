"""
نماذج المدفوعات: حسابات الاستلام (Hesaplarım) + إشعارات الدفع (Ödeme Takip).
مبني على docs/DATABASE_SCHEMA.md (قسم ج).
"""
from decimal import Decimal
from django.db import models

from core.models import Tenant, User


class ReceivingAccount(models.Model):
    """حساب استلام أموال (Hesaplarım) — بنك أو محفظة إلكترونية."""

    class Method(models.TextChoices):
        SHAM_CASH = "sham_cash", "شام كاش"
        MTN_CASH = "mtn_cash", "MTN كاش"
        SYRIATEL_CASH = "syriatel_cash", "سيرياتيل كاش"
        BANK = "bank", "تحويل بنكي"
        CASH = "cash", "نقدي"

    class Status(models.TextChoices):
        ACTIVE = "active", "نشط"
        PASSIVE = "passive", "معطّل"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="receiving_accounts")
    method = models.CharField(max_length=16, choices=Method.choices, default=Method.SHAM_CASH)
    title = models.CharField(max_length=120)              # Kurum/Şube Adı
    account_no = models.CharField(max_length=120, blank=True, default="")  # Hesap No
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    notification_enabled = models.BooleanField(default=True)  # Bildirim
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "receiving_accounts"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.title} ({self.get_method_display()})"


class PaymentNotification(models.Model):
    """إشعار دفع من وكيل (Ödeme Takip): تحويل → إبلاغ → موافقة الأدمن → إضافة رصيد."""

    class Status(models.TextChoices):
        PENDING = "pending", "قيد المراجعة"
        APPROVED = "approved", "مقبول"
        REJECTED = "rejected", "مرفوض"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payment_notifications")
    dealer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payment_notifications")
    account = models.ForeignKey(
        ReceivingAccount, null=True, blank=True, on_delete=models.SET_NULL, related_name="notifications"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    note = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payment_notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"دفعة {self.amount} من {self.dealer.name} [{self.status}]"
