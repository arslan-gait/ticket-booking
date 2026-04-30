import json
import logging
from urllib import error, request

from django.conf import settings

from .constants import (
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
        lines.append(
            f'{TELEGRAM_ADMIN_LINK_LABEL}: <a href="{settings.ADMIN_BOOKINGS_URL}">{settings.ADMIN_BOOKINGS_URL}</a>'
        )
    return '\n'.join(lines)
