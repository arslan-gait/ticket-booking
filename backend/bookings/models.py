import hashlib
import hmac
import json
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from events.models import Event, Seat


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bookings')
    customer_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.customer_name} - {self.event.name} ({self.status})'


class BookingItem(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='items')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='booking_items')
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE, related_name='booking_items')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(
                fields=['booking', 'seat'],
                name='unique_seat_per_booking',
            ),
            models.UniqueConstraint(
                fields=['event', 'seat'],
                condition=models.Q(is_active=True),
                name='unique_active_seat_per_event',
            ),
        ]

    def __str__(self):
        return f'{self.booking.customer_name} - Seat {self.seat}'


class Ticket(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='ticket')
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    qr_data = models.TextField(blank=True, default='')
    is_scanned = models.BooleanField(default=False)
    scanned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def generate_qr_data(self):
        payload = json.dumps({
            'ticket_id': str(self.token),
            'booking_id': self.booking_id,
        }, separators=(',', ':'))
        signature = hmac.new(
            settings.QR_SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        self.qr_data = json.dumps({
            'payload': payload,
            'sig': signature,
        }, separators=(',', ':'))
        return self.qr_data

    @staticmethod
    def verify_qr_data(qr_data_str):
        try:
            data = json.loads(qr_data_str)
            payload = data['payload']
            signature = data['sig']
        except (json.JSONDecodeError, KeyError):
            return None

        expected_sig = hmac.new(
            settings.QR_SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return None

        return json.loads(payload)

    def __str__(self):
        return f'Ticket {self.token} for {self.booking}'
