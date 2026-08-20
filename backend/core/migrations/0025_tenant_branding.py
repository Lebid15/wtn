# هويّة المتجر في صفحة الدخول: شعارٌ مرفوع، وسطرٌ تحت الاسم، وروابط تواصل.
#
# `logo_url` يتّسع من `CharField(300)` إلى `TextField` كي يسع `data:image/...`
# مرفوعاً من اللوحة — وكان صاحب المتجر يحتاج استضافةً خارجية لشعاره.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_tenant_sub_enforce_tenant_sub_grace_days_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tenant',
            name='logo_url',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tenant',
            name='tagline',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='tenant',
            name='login_footer',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='tenant',
            name='social_links',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
