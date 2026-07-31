"""
تحويل دفتر كل متجر إلى الدولار — مرّة واحدة.

قرار المالك: عملة الدفتر دولار لكامل الموقع. البيانات وقت هذا الترحيل كلّها
تجريبية، فالتحويل يجري آلياً عند النشر بدل أمر يدوي على الخادم.

السعر المستعمل هو سعر الدولار المحفوظ في «أسعار الصرف» لكل متجر، فإن لم يكن
مضبوطاً استُعمل 41.5 (السعر المزروع افتراضاً لدفترٍ بالليرة التركية).

يعكس هذا الترحيلُ منطقَ أمر `convert_base_currency` نفسه، ويبقى الأمر متاحاً
لأي تحويل لاحق.
"""
from decimal import Decimal, InvalidOperation

from django.db import migrations

TARGET = "USD"
FALLBACK_RATE = Decimal("41.5")

# (اسم التطبيق، اسم النموذج، الحقول المحفوظة بعملة الدفتر)
MONEY = [
    ("core", "User", ["oyun_load_limit"]),
    ("core", "Wallet", ["balance", "credit_limit"]),
    ("core", "WalletTransaction", ["amount", "balance_before", "balance_after"]),
    ("catalog", "Product", ["cost_price", "recommended_price"]),
    ("catalog", "ProductPrice", ["price"]),
    ("orders", "Order", ["cost_price", "sell_price", "profit",
                         "dealer_sell_price", "dealer_profit",
                         "balance_before", "balance_after"]),
    ("payments", "ReceivingAccount", ["balance"]),
    ("payments", "PaymentNotification", ["credit_amount", "balance_before", "balance_after"]),
    ("pool", "Pin", ["cost"]),
    ("providers", "Provider", ["real_balance", "balance", "debt", "balance_alert_threshold"]),
]

CENT = Decimal("0.01")
SIX = Decimal("0.000001")


def to_usd(apps, schema_editor):
    Tenant = apps.get_model("core", "Tenant")
    User = apps.get_model("core", "User")
    Wallet = apps.get_model("core", "Wallet")
    PaymentNotification = apps.get_model("payments", "PaymentNotification")

    for tenant in Tenant.objects.all():
        old = tenant.base_currency or "TRY"
        if old == TARGET:
            continue

        try:
            rate = Decimal(str((tenant.exchange_rates or {}).get(TARGET, "")))
        except (InvalidOperation, TypeError):
            rate = Decimal("0")
        if rate <= 0:
            rate = FALLBACK_RATE

        for app_label, model_name, fields in MONEY:
            model = apps.get_model(app_label, model_name)
            for row in model.objects.filter(tenant=tenant).iterator(chunk_size=500):
                for f in fields:
                    v = getattr(row, f)
                    if v is not None:
                        setattr(row, f, (Decimal(v) / rate).quantize(CENT))
                row.save(update_fields=fields)

        Wallet.objects.filter(tenant=tenant).update(currency=TARGET)

        # سعر الصرف في طلبات الإيداع كان من عملة الطريقة إلى العملة القديمة
        for n in PaymentNotification.objects.filter(tenant=tenant).iterator(chunk_size=500):
            n.rate = (n.rate / rate).quantize(SIX)
            n.save(update_fields=["rate"])

        # الأسعار المحفوظة كانت مقابل العملة القديمة، والعملة القديمة تنال سعرها
        converted = {
            c: str((Decimal(str(v)) / rate).quantize(SIX))
            for c, v in (tenant.exchange_rates or {}).items()
            if c != TARGET
        }
        converted[old] = str((Decimal("1") / rate).quantize(SIX))
        tenant.exchange_rates = converted
        tenant.base_currency = TARGET
        tenant.save(update_fields=["base_currency", "exchange_rates"])

        # عملة عرضٍ صارت هي عملة الدفتر ⇒ تُفرَّغ
        User.objects.filter(tenant=tenant, display_currency=TARGET).update(display_currency="")


def noop(apps, schema_editor):
    """لا رجوع: العودة تحتاج سعر الصرف وقت التحويل، ولا يُحفظ."""


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0014_alter_tenant_base_currency"),
        ("catalog", "0008_productlink"),
        ("orders", "0003_order_dealer_sell_price_order_dealer_profit"),
        ("payments", "0002_paymentnotification_admin_note_and_more"),
        ("pool", "0001_initial"),
        ("providers", "0001_initial"),
    ]

    operations = [migrations.RunPython(to_usd, noop)]
