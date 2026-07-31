"""
قلب اتجاه سعر الصرف المحفوظ.

كان: exchange_rates[CUR] = كم وحدةً من عملة الموقع تساوي وحدةً من CUR
      (دفتر بالدولار ⇒ {"TRY": "0.024096"})
صار: exchange_rates[CUR] = كم وحدةً من CUR تساوي وحدةً من عملة الموقع
      (دفتر بالدولار ⇒ {"TRY": "41.5007"})

السبب: هذا هو الاتجاه الذي يفكّر به المالك ويكتبه — «كل دولار يساوي كم ليرة».
وحفظُ مقلوبِ ما يكتبه كان يُدخل فروقَ تقريب في رقمٍ يراه بعينه.

لا يمسّ هذا الترحيلُ أي مبلغ — الأرصدة والأسعار كما هي، لأن الأرقام كلّها
محفوظة بعملة الدفتر لا بعملة أخرى.
"""
from decimal import Decimal, DivisionByZero, InvalidOperation

from django.db import migrations

SIX = Decimal("0.000001")


def flip(rates):
    out = {}
    for cur, val in (rates or {}).items():
        try:
            d = Decimal(str(val))
            if d > 0:
                out[cur] = str((Decimal("1") / d).quantize(SIX))
        except (InvalidOperation, TypeError, DivisionByZero):
            continue
    return out


def forward(apps, schema_editor):
    Tenant = apps.get_model("core", "Tenant")
    for t in Tenant.objects.exclude(exchange_rates={}):
        flipped = flip(t.exchange_rates)
        if flipped != t.exchange_rates:
            t.exchange_rates = flipped
            t.save(update_fields=["exchange_rates"])


class Migration(migrations.Migration):
    dependencies = [("core", "0015_ledger_to_usd")]

    # القلب معكوسٌ لنفسه: تطبيقه مرّتين يعيد الأصل
    operations = [migrations.RunPython(forward, forward)]
