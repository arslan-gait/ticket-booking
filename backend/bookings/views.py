from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from events.models import Event, Seat

from .models import Booking, BookingItem, Ticket
from .serializers import (
    BookingDetailSerializer,
    BookingListSerializer,
    CreateBookingSerializer,
    UpdateBookingStatusSerializer,
    VerifyTicketSerializer,
)

ROW_PRICE_PREFIX = 'row:'


def build_row_price_key(section: str, row_label: str) -> str:
    return f'{section.strip()}::{row_label.strip()}'


def split_price_tiers(price_tiers):
    seat_type_prices = {}
    row_prices = {}
    for raw_key, raw_price in price_tiers.items():
        key = str(raw_key).strip()
        price = Decimal(str(raw_price))
        if key.startswith(ROW_PRICE_PREFIX):
            row_key = key[len(ROW_PRICE_PREFIX):].strip()
            if row_key:
                row_prices[row_key] = price
            continue
        if key:
            seat_type_prices[key] = price
    return seat_type_prices, row_prices


def resolve_seat_price(seat, seat_type_prices, row_prices):
    row_key = build_row_price_key(seat.section or '', seat.row_label or '')
    if row_key in row_prices:
        return row_prices[row_key]
    return seat_type_prices.get((seat.seat_type or '').strip())


class BookingViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        Booking.objects
        .select_related('event', 'event__venue', 'ticket')
        .prefetch_related('items', 'items__seat')
        .all()
    )

    def get_serializer_class(self):
        if self.action == 'list':
            return BookingListSerializer
        return BookingDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        event_id = self.request.query_params.get('event')
        status_filter = self.request.query_params.get('status')
        if event_id:
            qs = qs.filter(event_id=event_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        booking = self.get_object()
        serializer = UpdateBookingStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        with transaction.atomic():
            booking.status = new_status
            booking.save(update_fields=['status', 'updated_at'])
            if new_status == 'cancelled':
                booking.items.update(is_active=False)
            elif new_status == 'paid':
                booking.items.update(is_active=True)

        return Response(BookingDetailSerializer(booking).data)


@api_view(['POST'])
def create_booking(request):
    serializer = CreateBookingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        event = Event.objects.select_related('venue').get(
            id=data['event_id'], is_active=True,
        )
    except Event.DoesNotExist:
        return Response(
            {'error': 'Event not found or not active.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    seat_ids = data['seat_ids']
    seats = list(
        Seat.objects.filter(id__in=seat_ids, venue=event.venue)
    )
    if len(seats) != len(seat_ids):
        return Response(
            {'error': 'One or more seats are invalid for this venue.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        seat_type_prices, row_prices = split_price_tiers(event.price_tiers)
    except Exception:
        return Response(
            {'error': 'Event price tiers contain invalid values.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    missing_price_types = sorted(
        {
            (seat.seat_type or '').strip()
            for seat in seats
            if resolve_seat_price(seat, seat_type_prices, row_prices) is None
        }
    )
    if missing_price_types:
        return Response(
            {
                'error': 'Missing seat type prices for this event.',
                'missing_seat_types': missing_price_types,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        taken_seats = (
            BookingItem.objects
            .filter(
                seat_id__in=seat_ids,
                event=event,
                is_active=True,
            )
            .select_for_update()
            .values_list('seat_id', flat=True)
        )
        taken_set = set(taken_seats)
        if taken_set:
            return Response(
                {
                    'error': 'Some seats are already booked.',
                    'taken_seat_ids': list(taken_set),
                },
                status=status.HTTP_409_CONFLICT,
            )

        total = Decimal('0')
        for seat in seats:
            price = resolve_seat_price(seat, seat_type_prices, row_prices)
            total += price

        booking = Booking.objects.create(
            event=event,
            customer_name=data['customer_name'],
            phone_number=data['phone_number'],
            status='pending',
            total_price=total,
        )

        items = []
        for seat in seats:
            price = resolve_seat_price(seat, seat_type_prices, row_prices)
            items.append(
                BookingItem(
                    booking=booking,
                    event=event,
                    seat=seat,
                    price=price,
                    is_active=True,
                )
            )
        BookingItem.objects.bulk_create(items)

        ticket = Ticket.objects.create(booking=booking)
        ticket.generate_qr_data()
        ticket.save(update_fields=['qr_data'])

    booking.refresh_from_db()
    return Response(
        BookingDetailSerializer(booking).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def event_seat_availability(request, event_id):
    try:
        event = Event.objects.select_related('venue').get(id=event_id)
    except Event.DoesNotExist:
        return Response(
            {'error': 'Event not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    seats = Seat.objects.filter(venue=event.venue).values(
        'id', 'label', 'cx', 'cy', 'section', 'row_label',
        'seat_number', 'seat_type',
    )

    booked_items = (
        BookingItem.objects
        .filter(event=event, is_active=True)
        .select_related('booking')
        .values('seat_id', 'booking__status')
    )

    seat_status_map = {}
    for item in booked_items:
        seat_id = item['seat_id']
        booking_status = item['booking__status']
        if booking_status == 'paid':
            seat_status_map[seat_id] = 'paid'
        elif seat_id not in seat_status_map:
            seat_status_map[seat_id] = 'booked'

    result = []
    for seat in seats:
        seat['status'] = seat_status_map.get(seat['id'], 'open')
        result.append(seat)

    return Response({
        'event_id': event.id,
        'venue': {
            'id': event.venue.id,
            'name': event.venue.name,
            'layout_meta': event.venue.layout_meta,
        },
        'price_tiers': event.price_tiers,
        'seats': result,
    })


@api_view(['POST'])
def verify_ticket(request):
    serializer = VerifyTicketSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    payload = Ticket.verify_qr_data(serializer.validated_data['qr_data'])
    if payload is None:
        return Response(
            {'valid': False, 'error': 'Invalid or tampered QR code.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        ticket = (
            Ticket.objects
            .select_related('booking', 'booking__event', 'booking__event__venue')
            .prefetch_related('booking__items', 'booking__items__seat')
            .get(token=payload['ticket_id'])
        )
    except Ticket.DoesNotExist:
        return Response(
            {'valid': False, 'error': 'Ticket not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    booking = ticket.booking

    if booking.status == 'cancelled':
        return Response({
            'valid': False,
            'error': 'This booking has been cancelled.',
        })

    if booking.status != 'paid':
        return Response({
            'valid': False,
            'error': 'This booking has not been paid yet.',
        })

    if ticket.is_scanned:
        return Response({
            'valid': False,
            'error': f'Already scanned at {ticket.scanned_at.isoformat()}.',
        })

    with transaction.atomic():
        rows_updated = (
            Ticket.objects
            .filter(id=ticket.id, is_scanned=False)
            .update(is_scanned=True, scanned_at=timezone.now())
        )
        if rows_updated == 0:
            return Response({
                'valid': False,
                'error': 'Ticket was just scanned by another device.',
            })

    ticket.refresh_from_db()
    seats = [
        {
            'section': item.seat.section,
            'row': item.seat.row_label,
            'number': item.seat.seat_number,
            'type': item.seat.seat_type,
        }
        for item in booking.items.all()
    ]

    return Response({
        'valid': True,
        'booking': {
            'id': booking.id,
            'customer_name': booking.customer_name,
            'phone_number': booking.phone_number,
            'event': booking.event.name,
            'event_date': booking.event.date.isoformat(),
            'venue': booking.event.venue.name,
            'seats': seats,
            'total_price': str(booking.total_price),
        },
        'scanned_at': ticket.scanned_at.isoformat(),
    })
