from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("core", "0021_user_agent_price_group")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="internal_supply_allowed",
            field=models.BooleanField(default=False),
        ),
    ]
