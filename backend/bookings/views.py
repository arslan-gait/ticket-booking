from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from common.viewset_mixins import ActionSerializerMixin
from events.models import Event, Seat

from .domain.constants import (
    BOOKING_KEY,
    CONSUMED_KEY,
    CUSTOMER_NAME_KEY,
    ERROR_KEY,
    EVENT_DATE_KEY,
    EVENT_ID_KEY,
    EVENT_KEY,
    EVENT_NOT_FOUND_MESSAGE,
    ID_KEY,
    INVALID_QR_MESSAGE,
    LAYOUT_META_KEY,
    NAME_KEY,
    NUMBER_KEY,
    PHONE_NUMBER_KEY,
    PRICE_TIERS_KEY,
    ROW_KEY,
    SCANNED_AT_KEY,
    SEATS_KEY,
    SECTION_KEY,
    TOTAL_PRICE_KEY,
    TICKET_NOT_FOUND_MESSAGE,
    TICKET_ID_KEY,
    TICKET_SCANNED_ELSEWHERE_MESSAGE,
    TYPE_KEY,
    VALID_KEY,
    VENUE_KEY,
    BookingStatus,
    SeatAvailabilityStatus,
)
from .domain.booking_creation import BookingCreationFailure, create_booking as create_booking_record
from .domain.ticket_validation import validate_ticket_state
from .models import Booking, BookingItem, Ticket
from .serializers import (
    BookingDetailSerializer,
    BookingListSerializer,
    CreateBookingSerializer,
    UpdateBookingStatusSerializer,
    VerifyTicketSerializer,
)

def api_error(message, status_code=None, **extra):
    payload = {ERROR_KEY: message}
    payload.update(extra)
    return Response(payload, status=status_code)


class BookingViewSet(ActionSerializerMixin, viewsets.ReadOnlyModelViewSet):
    queryset = (
        Booking.objects
        .select_related('event', 'event__venue', 'ticket')
        .prefetch_related('items', 'items__seat')
        .all()
    )
    default_serializer_class = BookingDetailSerializer
    serializer_action_classes = {
        'list': BookingListSerializer,
    }

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
            if new_status == BookingStatus.CANCELLED:
                booking.items.update(is_active=False)
            elif new_status == BookingStatus.PAID:
                booking.items.update(is_active=True)

        return Response(BookingDetailSerializer(booking).data)


@api_view(['POST'])
def create_booking(request):
    serializer = CreateBookingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        booking = create_booking_record(serializer.validated_data)
    except BookingCreationFailure as error:
        return api_error(
            error.message,
            error.status_code,
            **error.extra,
        )

    booking.refresh_from_db()
    return Response(
        BookingDetailSerializer(booking).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def public_booking_detail(request, token):
    booking = get_object_or_404(
        Booking.objects
        .select_related('event', 'event__venue', 'ticket')
        .prefetch_related('items', 'items__seat'),
        ticket__token=token,
    )
    return Response(BookingDetailSerializer(booking).data)


@api_view(['GET'])
def event_seat_availability(request, event_id):
    try:
        event = Event.objects.select_related('venue').get(id=event_id)
    except Event.DoesNotExist:
        return api_error(
            EVENT_NOT_FOUND_MESSAGE,
            status.HTTP_404_NOT_FOUND,
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
        if booking_status == BookingStatus.PAID:
            seat_status_map[seat_id] = SeatAvailabilityStatus.PAID
        elif seat_id not in seat_status_map:
            seat_status_map[seat_id] = SeatAvailabilityStatus.BOOKED

    result = []
    for seat in seats:
        seat['status'] = seat_status_map.get(seat['id'], SeatAvailabilityStatus.OPEN)
        result.append(seat)

    return Response({
        EVENT_ID_KEY: event.id,
        VENUE_KEY: {
            ID_KEY: event.venue.id,
            NAME_KEY: event.venue.name,
            'address_line': event.venue.address_line,
            LAYOUT_META_KEY: event.venue.layout_meta,
        },
        PRICE_TIERS_KEY: event.price_tiers,
        SEATS_KEY: result,
    })


@api_view(['POST'])
def verify_ticket(request):
    serializer = VerifyTicketSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    consume = serializer.validated_data['consume']

    payload = Ticket.verify_qr_data(serializer.validated_data['qr_data'])
    if payload is None:
        return Response(
            {VALID_KEY: False, ERROR_KEY: INVALID_QR_MESSAGE},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        ticket = (
            Ticket.objects
            .select_related('booking', 'booking__event', 'booking__event__venue')
            .prefetch_related('booking__items', 'booking__items__seat')
            .get(token=payload[TICKET_ID_KEY])
        )
    except Ticket.DoesNotExist:
        return Response(
            {VALID_KEY: False, ERROR_KEY: TICKET_NOT_FOUND_MESSAGE},
            status=status.HTTP_404_NOT_FOUND,
        )

    booking = ticket.booking

    state_error = validate_ticket_state(
        booking_status=booking.status,
        is_scanned=ticket.is_scanned,
        scanned_at=ticket.scanned_at,
    )
    if state_error is not None:
        return Response({
            VALID_KEY: False,
            ERROR_KEY: state_error.message,
        })

    seats = [
        {
            SECTION_KEY: item.seat.section,
            ROW_KEY: item.seat.row_label,
            NUMBER_KEY: item.seat.seat_number,
            TYPE_KEY: item.seat.seat_type,
        }
        for item in booking.items.all()
    ]
    if consume:
        with transaction.atomic():
            rows_updated = (
                Ticket.objects
                .filter(id=ticket.id, is_scanned=False)
                .update(is_scanned=True, scanned_at=timezone.now())
            )
            if rows_updated == 0:
                return Response({
                    VALID_KEY: False,
                    ERROR_KEY: TICKET_SCANNED_ELSEWHERE_MESSAGE,
                })
        ticket.refresh_from_db()

    return Response({
        VALID_KEY: True,
        CONSUMED_KEY: consume,
        BOOKING_KEY: {
            ID_KEY: booking.id,
            CUSTOMER_NAME_KEY: booking.customer_name,
            PHONE_NUMBER_KEY: booking.phone_number,
            EVENT_KEY: booking.event.name,
            EVENT_DATE_KEY: booking.event.date.isoformat(),
            VENUE_KEY: booking.event.venue.name,
            SEATS_KEY: seats,
            TOTAL_PRICE_KEY: str(booking.total_price),
        },
        SCANNED_AT_KEY: ticket.scanned_at.isoformat() if ticket.scanned_at else None,
    })
