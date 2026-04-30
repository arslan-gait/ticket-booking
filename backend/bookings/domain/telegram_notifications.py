import json
import logging
from concurrent.futures import ThreadPoolExecutor
from urllib import error, parse, request

from django.conf import settings

from .constants import (
    BOOKING_ID_KEY,
    TELEGRAM_ADMIN_LINK_LABEL,
    TELEGRAM_BOOKING_ID_LABEL,
    TELEGRAM_CUSTOMER_LABEL,
    TELEGRAM_EVENT_DATE_LABEL,
    TELEGRAM_EVENT_LABEL,
    TELEGRAM_NEW_BOOKING_TITLE,
    TELEGRAM_PARSE_MODE_HTML,
    TELEGRAM_PHONE_LABEL,
    TELEGRAM_SEND_MESSAGE_METHOD,
    TELEGRAM_TOTAL_PRICE_LABEL,
)

logger = logging.getLogger(__name__)
NOTIFICATION_WORKERS = 2
_notification_executor = ThreadPoolExecutor(max_workers=NOTIFICATION_WORKERS)


def notify_new_booking(booking):
    if not settings.TELEGRAM_BOOKING_NOTIFICATIONS_ENABLED:
        return
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return

    message_text = _build_booking_message_text(booking)
    url = _build_send_message_url(settings.TELEGRAM_BOT_TOKEN)
    payload = {
        'chat_id': settings.TELEGRAM_CHAT_ID,
        'text': message_text,
        'parse_mode': TELEGRAM_PARSE_MODE_HTML,
        'disable_web_page_preview': True,
    }

    req = request.Request(
        url=url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with request.urlopen(req, timeout=5):
            return
    except (error.URLError, TimeoutError, ValueError) as exc:
        logger.warning(
            'Telegram booking notification failed for booking_id=%s: %s',
            booking.id,
            exc,
        )


def notify_new_booking_async(booking_id):
    try:
        _notification_executor.submit(_notify_new_booking_by_id, booking_id)
    except Exception as exc:
        logger.warning(
            'Telegram booking notification scheduling failed for booking_id=%s: %s',
            booking_id,
            exc,
        )


def _notify_new_booking_by_id(booking_id):
    from ..models import Booking

    try:
        booking = Booking.objects.select_related('event').get(id=booking_id)
    except Booking.DoesNotExist:
        logger.warning(
            'Telegram booking notification skipped: booking_id=%s not found',
            booking_id,
        )
        return

    notify_new_booking(booking)


def _build_send_message_url(bot_token):
    return f'https://api.telegram.org/bot{bot_token}/{TELEGRAM_SEND_MESSAGE_METHOD}'


def _build_booking_message_text(booking):
    lines = [
        f'<b>{TELEGRAM_NEW_BOOKING_TITLE}</b>',
        f'{TELEGRAM_BOOKING_ID_LABEL}: #{booking.id}',
        f'{TELEGRAM_CUSTOMER_LABEL}: {booking.customer_name}',
        f'{TELEGRAM_PHONE_LABEL}: {booking.phone_number}',
        f'{TELEGRAM_EVENT_LABEL}: {booking.event.name}',
        f'{TELEGRAM_EVENT_DATE_LABEL}: {booking.event.date.isoformat()}',
        f'{TELEGRAM_TOTAL_PRICE_LABEL}: {booking.total_price}',
    ]
    if settings.ADMIN_BOOKINGS_URL:
        admin_bookings_url = _build_admin_bookings_url(settings.ADMIN_BOOKINGS_URL, booking.id)
        lines.append(
            f'{TELEGRAM_ADMIN_LINK_LABEL}: <a href="{admin_bookings_url}">{admin_bookings_url}</a>'
        )
    return '\n'.join(lines)


def _build_admin_bookings_url(base_url, booking_id):
    parsed_url = parse.urlsplit(base_url)
    query_params = parse.parse_qsl(parsed_url.query, keep_blank_values=True)
    query_params.append((BOOKING_ID_KEY, str(booking_id)))
    updated_query = parse.urlencode(query_params)
    return parse.urlunsplit(
        (
            parsed_url.scheme,
            parsed_url.netloc,
            parsed_url.path,
            updated_query,
            parsed_url.fragment,
        )
    )
