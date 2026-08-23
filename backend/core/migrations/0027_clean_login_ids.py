"""
تنقية أرقام الدخول المحفوظة من المحارف التي لا تُرى.

صاحب متجر «zad» لم يستطع الدخول أبداً: نُسخ رقمه من عرضٍ عربي فجاء معه
محرفا العزل U+2066 و U+2069 حول الرقم وحُفظا في القاعدة. الحقل يبدو مطابقاً
تماماً على الشاشة، والرسالة «بيانات الدخول غير صحيحة» لا تفسّر شيئاً.

ويُنقَّى ما هو محفوظ لا الوارد وحده: حسابٌ خُلق قبل اليوم يبقى مقفلاً على
صاحبه مهما نُقِّي ما يكتبه.
"""

from django.db import migrations

from core.text import clean_login_id


def clean(apps, schema_editor):
    User = apps.get_model("core", "User")
    for user in User.objects.all():
        cleaned = clean_login_id(user.login_id)
        if cleaned == user.login_id:
            continue
        # تصادمٌ بعد التنقية: صفّان يصيران رقماً واحداً. لا يُلمس أيٌّ منهما
        # ويُترك للمالك — والاختيار بين حسابين ليس قراراً تتخذه ترحيلة.
        if cleaned and not User.objects.filter(login_id=cleaned).exists():
            user.login_id = cleaned
            user.save(update_fields=["login_id"])


class Migration(migrations.Migration):
    dependencies = [("core", "0026_dealer_tickets_and_card_reads")]
    operations = [migrations.RunPython(clean, migrations.RunPython.noop)]
