from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0027_clean_login_ids")]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="ui_scale",
            field=models.PositiveSmallIntegerField(default=100),
        ),
    ]
