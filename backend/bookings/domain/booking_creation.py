from dataclasses import dataclass, field
from http import HTTPStatus

from django.db import transaction

from events.models import Event, Seat

from ..models import Booking, BookingItem, Ticket

from .constants import (
    CUSTOMER_NAME_KEY,
    EVENT_ID_KEY,
    MISSING_SEAT_TYPES_KEY,
    PHONE_NUMBER_KEY,
    SEATS_NOT_AVAILABLE_FOR_VENUE_MESSAGE,
    SEAT_IDS_KEY,
    TAKEN_SEAT_IDS_KEY,
    BookingStatus,
    EVENT_NOT_FOUND_OR_INACTIVE_MESSAGE,
    INVALID_PRICE_TIERS_MESSAGE,
    MISSING_PRICE_TYPES_MESSAGE,
    SEATS_ALREADY_BOOKED_MESSAGE,
)
from .pricing import build_priced_seats, resolve_seat_price, split_price_tiers


@dataclass(frozen=True)
class BookingCreationFailure(Exception):
    message: str
    status_code: int
    extra: dict = field(default_factory=dict)


def create_booking(validated_data):
    event = _get_active_event(validated_data[EVENT_ID_KEY])
    seat_ids = validated_data[SEAT_IDS_KEY]
    seats = _get_event_seats(event, seat_ids)
    seat_type_prices, row_prices = _split_event_price_tiers(event.price_tiers)
    _ensure_all_prices_defined(seats, seat_type_prices, row_prices)

    with transaction.atomic():
        taken_set = _get_taken_seats(event, seat_ids)
        if taken_set:
            raise BookingCreationFailure(
                message=SEATS_ALREADY_BOOKED_MESSAGE,
                status_code=HTTPStatus.CONFLICT,
                extra={TAKEN_SEAT_IDS_KEY: list(taken_set)},
            )

        priced_seats, total = build_priced_seats(seats, seat_type_prices, row_prices)
        booking = Booking.objects.create(
            event=event,
            customer_name=validated_data[CUSTOMER_NAME_KEY],
            phone_number=validated_data[PHONE_NUMBER_KEY],
            status=BookingStatus.PENDING,
            total_price=total,
        )
        _create_booking_items(booking=booking, event=event, priced_seats=priced_seats)
        _create_ticket(booking)

    return booking


def _get_active_event(event_id):
    try:
        return Event.objects.select_related('venue').get(id=event_id, is_active=True)
    except Event.DoesNotExist as exc:
        raise BookingCreationFailure(
            message=EVENT_NOT_FOUND_OR_INACTIVE_MESSAGE,
            status_code=HTTPStatus.NOT_FOUND,
        ) from exc


def _get_event_seats(event, seat_ids):
    seats = list(Seat.objects.filter(id__in=seat_ids, venue=event.venue))
    if len(seats) != len(seat_ids):
        raise BookingCreationFailure(
            message=SEATS_NOT_AVAILABLE_FOR_VENUE_MESSAGE,
            status_code=HTTPStatus.BAD_REQUEST,
        )
    return seats


def _split_event_price_tiers(price_tiers):
    try:
        return split_price_tiers(price_tiers)
    except Exception as exc:
        raise BookingCreationFailure(
            message=INVALID_PRICE_TIERS_MESSAGE,
            status_code=HTTPStatus.BAD_REQUEST,
        ) from exc


def _ensure_all_prices_defined(seats, seat_type_prices, row_prices):
    missing_price_types = sorted(
        {
            (seat.seat_type or '').strip()
            for seat in seats
            if resolve_seat_price(seat, seat_type_prices, row_prices) is None
        }
    )
    if missing_price_types:
        raise BookingCreationFailure(
            message=MISSING_PRICE_TYPES_MESSAGE,
            status_code=HTTPStatus.BAD_REQUEST,
            extra={MISSING_SEAT_TYPES_KEY: missing_price_types},
        )


def _get_taken_seats(event, seat_ids):
    taken_seats = (
        BookingItem.objects
        .filter(seat_id__in=seat_ids, event=event, is_active=True)
        .select_for_update()
        .values_list('seat_id', flat=True)
    )
    return set(taken_seats)


def _create_booking_items(booking, event, priced_seats):
    items = [
        BookingItem(
            booking=booking,
            event=event,
            seat=priced_seat.seat,
            price=priced_seat.price,
            is_active=True,
        )
        for priced_seat in priced_seats
    ]
    BookingItem.objects.bulk_create(items)


def _create_ticket(booking):
    ticket = Ticket.objects.create(booking=booking)
    ticket.generate_qr_data()
    ticket.save(update_fields=['qr_data'])
