"""
أسعار المزوّدين المحفوظة على الروابط كانت بالليرة بينما تحوّل الدفتر إلى
الدولار (core.0015) — فصارت حماية الخسارة تقارن 43.40 ل.ت بسعر بيعٍ 1.20$
وترى كل طلب خاسراً فتتخطّى المزوّد. هذا الترحيل يحوّلها مرّة واحدة.

معكوسٌ لنفسه: العكس يضرب بالسعر بدل أن يقسم عليه.
"""
from decimal import Decimal, InvalidOperation

from django.db import migrations

CENT = Decimal("0.01")
PROVIDER_CURRENCY = "TRY"


def _rate(tenant) -> Decimal:
    """كم ليرةً تساوي وحدةً من عملة الدفتر. صفر = لا تحويل."""
    base = tenant.base_currency or "USD"
    if base == PROVIDER_CURRENCY:
        return Decimal("0")  # الدفتر بالليرة أصلاً — لا شيء يُحوَّل
    try:
        r = Decimal(str((tenant.exchange_rates or {}).get(PROVIDER_CURRENCY, "0")))
    except (InvalidOperation, TypeError):
        return Decimal("0")
    return r if r > 0 else Decimal("0")


def _walk(apps, divide: bool):
    ProductLink = apps.get_model("catalog", "ProductLink")
    Tenant = apps.get_model("core", "Tenant")

    for tenant in Tenant.objects.all():
        rate = _rate(tenant)
        if rate <= 0:
            continue
        for link in ProductLink.objects.filter(tenant=tenant):
            raw = (link.extra or {}).get("price")
            if raw in (None, ""):
                continue
            try:
                value = Decimal(str(raw).replace(",", "."))
            except (InvalidOperation, ValueError):
                continue
            converted = (value / rate) if divide else (value * rate)
            link.extra = {**link.extra, "price": str(converted.quantize(CENT))}
            link.save(update_fields=["extra"])


def to_base(apps, schema_editor):
    _walk(apps, divide=True)


def to_provider(apps, schema_editor):
    _walk(apps, divide=False)


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0008_productlink"),
        ("core", "0016_flip_exchange_rate_direction"),
    ]

    operations = [migrations.RunPython(to_base, to_provider)]
