from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0002_alter_seat_seat_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='venue',
            name='address_line',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
