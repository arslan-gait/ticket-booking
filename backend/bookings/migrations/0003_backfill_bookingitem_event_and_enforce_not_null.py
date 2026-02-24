from django.db import migrations, models
import django.db.models.deletion


def backfill_event_and_active(apps, schema_editor):
    BookingItem = apps.get_model('bookings', 'BookingItem')
    for item in BookingItem.objects.select_related('booking').all().iterator():
        item.event_id = item.booking.event_id
        item.is_active = item.booking.status != 'cancelled'
        item.save(update_fields=['event', 'is_active'])


class Migration(migrations.Migration):
    dependencies = [
        ('bookings', '0002_bookingitem_event_bookingitem_is_active_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_event_and_active, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='bookingitem',
            name='event',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='booking_items',
                to='events.event',
            ),
        ),
    ]
