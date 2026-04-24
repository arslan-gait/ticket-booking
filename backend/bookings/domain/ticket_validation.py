from dataclasses import dataclass

from .constants import (
    BOOKING_CANCELLED_CODE,
    BOOKING_CANCELLED_MESSAGE,
    BOOKING_UNPAID_CODE,
    BOOKING_UNPAID_MESSAGE,
    TICKET_ALREADY_SCANNED_CODE,
)
from .constants import BookingStatus


@dataclass(frozen=True)
class TicketValidationError:
    code: str
    message: str


def validate_ticket_state(booking_status, is_scanned, scanned_at):
    if booking_status == BookingStatus.CANCELLED:
        return TicketValidationError(
            code=BOOKING_CANCELLED_CODE,
            message=BOOKING_CANCELLED_MESSAGE,
        )

    if booking_status != BookingStatus.PAID:
        return TicketValidationError(
            code=BOOKING_UNPAID_CODE,
            message=BOOKING_UNPAID_MESSAGE,
        )

    if is_scanned:
        return TicketValidationError(
            code=TICKET_ALREADY_SCANNED_CODE,
            message=f'Билет уже погашен: {scanned_at.isoformat()}.',
        )

    return None
