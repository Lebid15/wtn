"""
نماذج المزوّدين: مزوّدو API لتنفيذ الطلبات (Oyun Apileri).
مبني على docs/DATABASE_SCHEMA.md (قسم ز).
"""
from decimal import Decimal
from django.db import models

from core.models import Tenant


class Provider(models.Model):
    """مزوّد API لتنفيذ الطلبات (خارجي أو داخلي أو يدوي)."""

    class Type(models.TextChoices):
        SAME_SYSTEM = "same_system", "نفس النظام"   # Aynı Sistem (znet)
        POOL = "pool", "بنك البينات"                 # Havuz
        CARD_STORE = "card_store", "متجر بطاقات"     # As7ab/Barakat/Ap4Stor
        LOADER = "loader", "منفّذ يدوي"              # Yükleyici

    class Status(models.TextChoices):
        ACTIVE = "active", "نشط"
        PASSIVE = "passive", "معطّل"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="providers")
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=16, choices=Type.choices, default=Type.CARD_STORE)
    config = models.JSONField(default=dict, blank=True)  # مفاتيح/روابط API
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    # عملة هذا المزوّد: بها يسعّر كتالوجه وبها يعطي رصيده ودَينه.
    # كان النظام يفترضها ليرةً تركيةً لكل مزوّد خارجي — صحيحٌ لـZNET وخطأٌ
    # لغيره، فيُقسَم سعرُ مزوّدٍ دولاريّ على ~41 ويظهر رخيصاً عشرات المرّات.
    # افتراضها TRY يُبقي سلوك المزوّدين المُعدّين سابقاً كما هو.
    # لا معنى لها في «بنك البينات» و«المنفّذ اليدوي» و«المتجر الداخلي» —
    # الأوّلان بلا أسعار خارجية، والثالث يحوّل بنفسه من دفتر المورّد.
    currency = models.CharField(max_length=8, default="TRY")

    real_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))  # Gerçek Bakiye
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))       # Bakiye
    debt = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))          # Borç

    loss_guard = models.BooleanField(default=True)   # Zarar Ayarı — منع البيع بخسارة
    auto_update = models.BooleanField(default=False)  # Oto Güncelleme للأسعار
    balance_alert_threshold = models.DecimalField(  # Bakiye Uyarısı
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "providers"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.name} [{self.type}]"
