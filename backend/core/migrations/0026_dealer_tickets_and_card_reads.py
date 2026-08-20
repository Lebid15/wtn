# رسالةٌ من صاحب المتجر إلى وكيلٍ بعينه، وأثرُ قراءة البطاقات.
#
# `recipient` بلا قيمة في كل التذاكر القائمة: وجهتُها `admin` أو `platform`
# ولا مخاطَب معيَّن لها، فالفراغ هو الصواب لا نقصٌ يُملأ لاحقاً.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0025_tenant_branding'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ticket',
            name='target',
            field=models.CharField(
                choices=[('admin', 'إدارة المتجر'), ('platform', 'مالك المنصّة'), ('dealer', 'وكيل')],
                default='admin', max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='ticket',
            name='recipient',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name='incoming_tickets', to='core.user',
            ),
        ),
        migrations.CreateModel(
            name='HomeCardRead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('read_at', models.DateTimeField(auto_now_add=True)),
                ('card', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                           related_name='reads', to='core.homecard')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                           related_name='card_reads', to='core.user')),
            ],
            options={'db_table': 'home_card_reads'},
        ),
        migrations.AddConstraint(
            model_name='homecardread',
            constraint=models.UniqueConstraint(fields=('card', 'user'), name='uniq_card_read'),
        ),
    ]
