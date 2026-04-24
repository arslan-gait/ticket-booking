import hashlib
import hmac
import json

from django.conf import settings

from .constants import BOOKING_ID_KEY, PAYLOAD_KEY, SIGNATURE_KEY, TICKET_ID_KEY

JSON_COMPACT_SEPARATORS = (',', ':')


def build_ticket_payload(ticket_id, booking_id):
    return json.dumps(
        {
            TICKET_ID_KEY: str(ticket_id),
            BOOKING_ID_KEY: booking_id,
        },
        separators=JSON_COMPACT_SEPARATORS,
    )


def sign_payload(payload):
    return hmac.new(
        settings.QR_SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()


def generate_qr_data(ticket_id, booking_id):
    payload = build_ticket_payload(ticket_id=ticket_id, booking_id=booking_id)
    signature = sign_payload(payload)
    return json.dumps(
        {
            PAYLOAD_KEY: payload,
            SIGNATURE_KEY: signature,
        },
        separators=JSON_COMPACT_SEPARATORS,
    )


def verify_qr_data(qr_data_str):
    try:
        data = json.loads(qr_data_str)
        payload = data[PAYLOAD_KEY]
        signature = data[SIGNATURE_KEY]
    except (json.JSONDecodeError, KeyError):
        return None

    expected_signature = sign_payload(payload)
    if not hmac.compare_digest(signature, expected_signature):
        return None

    return json.loads(payload)
