from rest_framework import serializers

from events.serializers import SeatSerializer

from .domain.constants import BookingStatus
from .models import Booking, BookingItem, Ticket


class BookingItemSerializer(serializers.ModelSerializer):
    seat_detail = SeatSerializer(source='seat', read_only=True)

    class Meta:
        model = BookingItem
        fields = ['id', 'event', 'seat', 'seat_detail', 'price', 'is_active']
        read_only_fields = ['event', 'price', 'is_active']


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['id', 'token', 'qr_data', 'is_scanned', 'scanned_at', 'created_at']


class BookingListSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_date = serializers.DateTimeField(source='event.date', read_only=True)
    seat_count = serializers.IntegerField(source='items.count', read_only=True)
    public_token = serializers.UUIDField(source='ticket.token', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'event', 'event_name', 'event_date', 'customer_name',
            'phone_number', 'status', 'total_price', 'seat_count', 'public_token', 'created_at',
        ]


class BookingDetailSerializer(serializers.ModelSerializer):
    items = BookingItemSerializer(many=True, read_only=True)
    ticket = TicketSerializer(read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_date = serializers.DateTimeField(source='event.date', read_only=True)
    venue_name = serializers.CharField(source='event.venue.name', read_only=True)
    public_token = serializers.UUIDField(source='ticket.token', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'event', 'event_name', 'event_date', 'venue_name',
            'customer_name', 'phone_number', 'status', 'total_price',
            'items', 'ticket', 'public_token', 'created_at',
        ]


class CreateBookingSerializer(serializers.Serializer):
    event_id = serializers.IntegerField()
    customer_name = serializers.CharField(max_length=255)
    phone_number = serializers.CharField(max_length=50)
    seat_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)


class VerifyTicketSerializer(serializers.Serializer):
    qr_data = serializers.CharField()
    consume = serializers.BooleanField(required=False, default=True)


class UpdateBookingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[BookingStatus.PAID, BookingStatus.CANCELLED],
    )
