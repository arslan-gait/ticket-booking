from django.db import models


class Venue(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    layout_meta = models.JSONField(
        default=dict, blank=True,
        help_text='Canvas metadata: width, height, background, decorative shapes',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Seat(models.Model):
    SEAT_TYPES = [
        ('regular', 'Regular'),
        ('vip', 'VIP'),
        ('balcony', 'Balcony'),
    ]

    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='seats')
    label = models.CharField(max_length=50, blank=True, default='')
    cx = models.FloatField(help_text='X coordinate on canvas')
    cy = models.FloatField(help_text='Y coordinate on canvas')
    section = models.CharField(max_length=100, blank=True, default='')
    row_label = models.CharField(max_length=50, blank=True, default='')
    seat_number = models.IntegerField(default=0)
    seat_type = models.CharField(max_length=50, choices=SEAT_TYPES, default='regular')

    class Meta:
        ordering = ['section', 'row_label', 'seat_number']

    def __str__(self):
        return f'{self.venue.name} - {self.section} {self.row_label}-{self.seat_number}'


class Event(models.Model):
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='events')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='events/', blank=True, null=True)
    date = models.DateTimeField()
    price_tiers = models.JSONField(
        default=dict, blank=True,
        help_text='Maps seat_type to price, e.g. {"vip": 50, "regular": 25}',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f'{self.name} ({self.date:%Y-%m-%d %H:%M})'
