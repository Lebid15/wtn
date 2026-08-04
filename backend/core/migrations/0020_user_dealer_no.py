"""رقم وكيل تسلسلي داخل كل متجر — يُعرض في «قائمة الوكلاء» بدل رقم الدخول النصّي."""
from django.db import migrations, models


def number_existing_dealers(apps, schema_editor):
    """يرقّم الوكلاء القائمين بترتيب إنشائهم: 1، 2، 3… لكل متجر على حدة."""
    User = apps.get_model("core", "User")
    tenants = (
        User.objects.filter(role__in=["bayi", "ana_bayi"])
        .values_list("tenant_id", flat=True).distinct()
    )
    for tenant_id in tenants:
        rows = User.objects.filter(
            tenant_id=tenant_id, role__in=["bayi", "ana_bayi"]
        ).order_by("id")
        for i, u in enumerate(rows, start=1):
            u.dealer_no = i
            u.save(update_fields=["dealer_no"])


class Migration(migrations.Migration):

    dependencies = [("core", "0019_user_whatsapp")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="dealer_no",
            field=models.PositiveIntegerField(blank=True, db_index=True, null=True),
        ),
        migrations.RunPython(number_existing_dealers, migrations.RunPython.noop),
    ]
