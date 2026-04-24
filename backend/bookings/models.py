import uuid

from django.db import models
from django.utils import timezone

from events.models import Event, Seat
from .domain.constants import BookingStatus
from .domain.qr_signer import generate_qr_data, verify_qr_data


class Booking(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bookings')
    customer_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=50)
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
    )
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
        self.qr_data = generate_qr_data(ticket_id=self.token, booking_id=self.booking_id)
        return self.qr_data

    @staticmethod
    def verify_qr_data(qr_data_str):
        return verify_qr_data(qr_data_str)

    def __str__(self):
        return f'Ticket {self.token} for {self.booking}'
