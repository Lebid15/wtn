"""أرقام الوكيل على الطلب: بكم باع لزبونه وكم ربح (مستقلّة عن أرقام المالك)."""
from decimal import Decimal

from django.db import migrations, models
from django.db.models import F


def backfill(apps, schema_editor):
    """
    الطلبات القديمة لم يُسجَّل فيها سعر بيع الوكيل — نضعه مساوياً لسعر شرائه
    فيكون ربحه صفراً. أصدق من تخمين سعر توصية قد يكون تغيّر منذ ذلك الحين.
    """
    apps.get_model("orders", "Order").objects.update(
        dealer_sell_price=F("sell_price"), dealer_profit=Decimal("0")
    )


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_order_last_sync_at_order_provider_note_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='dealer_sell_price',
            field=models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=12),
        ),
        migrations.AddField(
            model_name='order',
            name='dealer_profit',
            field=models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=12),
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
