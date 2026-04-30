from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('bookings', '0003_backfill_bookingitem_event_and_enforce_not_null'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='commentary',
            field=models.TextField(blank=True, default=''),
        ),
    ]
