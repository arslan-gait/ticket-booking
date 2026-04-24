from dataclasses import dataclass
from decimal import Decimal

from .constants import ROW_PRICE_PREFIX


@dataclass(frozen=True)
class PricedSeat:
    seat: object
    price: Decimal


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


def build_priced_seats(seats, seat_type_prices, row_prices):
    priced_seats = []
    total = Decimal('0')
    for seat in seats:
        price = resolve_seat_price(seat, seat_type_prices, row_prices)
        if price is None:
            continue
        priced = PricedSeat(seat=seat, price=price)
        priced_seats.append(priced)
        total += price
    return priced_seats, total
