import uuid
from datetime import timedelta
from pathlib import Path

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from events.models import Event, Seat, Venue

from .domain.constants import (
    CONSUMED_KEY,
    ERROR_KEY,
    MISSING_SEAT_TYPES_KEY,
    TAKEN_SEAT_IDS_KEY,
    VALID_KEY,
    BookingStatus,
)
from .domain.qr_signer import generate_qr_data
from .models import Booking, BookingItem, Ticket


class BookingApiTests(APITestCase):
    def setUp(self):
        self.venue = Venue.objects.create(name='Arena')
        self.seat_vip = Seat.objects.create(
            venue=self.venue, label='A1', cx=10, cy=10, section='A', row_label='1', seat_number=1, seat_type='vip',
        )
        self.seat_regular = Seat.objects.create(
            venue=self.venue, label='A2', cx=20, cy=10, section='A', row_label='1', seat_number=2, seat_type='regular',
        )
        self.event = Event.objects.create(
            venue=self.venue,
            name='Concert',
            date=timezone.now() + timedelta(days=1),
            is_active=True,
            price_tiers={'vip': 100, 'regular': 50},
        )

    def _create_booking_payload(self, seat_ids):
        return {
            'event_id': self.event.id,
            'customer_name': 'Alice',
            'phone_number': '+10000000',
            'seat_ids': seat_ids,
        }

    def test_create_booking_success_returns_201_and_contract(self):
        response = self.client.post(
            reverse('create-booking'),
            self._create_booking_payload([self.seat_vip.id, self.seat_regular.id]),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['status'], BookingStatus.PENDING)
        self.assertEqual(response.data['total_price'], '150.00')
        self.assertIn('items', response.data)
        self.assertEqual(len(response.data['items']), 2)
        self.assertIn('ticket', response.data)

    def test_create_booking_event_not_found_contract(self):
        payload = self._create_booking_payload([self.seat_vip.id])
        payload['event_id'] = 999999

        response = self.client.post(reverse('create-booking'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn(ERROR_KEY, response.data)

    def test_create_booking_invalid_seat_returns_400(self):
        other_venue = Venue.objects.create(name='Other')
        other_seat = Seat.objects.create(
            venue=other_venue,
            label='B1',
            cx=1,
            cy=1,
            section='B',
            row_label='1',
            seat_number=1,
            seat_type='vip',
        )

        response = self.client.post(
            reverse('create-booking'),
            self._create_booking_payload([self.seat_vip.id, other_seat.id]),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(ERROR_KEY, response.data)

    def test_create_booking_missing_price_type_returns_400_with_key(self):
        Seat.objects.create(
            venue=self.venue,
            label='C1',
            cx=30,
            cy=10,
            section='C',
            row_label='1',
            seat_number=1,
            seat_type='balcony',
        )
        missing_price_seat = Seat.objects.get(label='C1')

        response = self.client.post(
            reverse('create-booking'),
            self._create_booking_payload([missing_price_seat.id]),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(ERROR_KEY, response.data)
        self.assertIn(MISSING_SEAT_TYPES_KEY, response.data)
        self.assertEqual(response.data[MISSING_SEAT_TYPES_KEY], ['balcony'])

    def test_create_booking_taken_seats_returns_409_with_taken_ids(self):
        booking = Booking.objects.create(
            event=self.event,
            customer_name='Bob',
            phone_number='+1222',
            status=BookingStatus.PAID,
            total_price='100.00',
        )
        BookingItem.objects.create(
            booking=booking,
            event=self.event,
            seat=self.seat_vip,
            price='100.00',
            is_active=True,
        )

        response = self.client.post(
            reverse('create-booking'),
            self._create_booking_payload([self.seat_vip.id]),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn(ERROR_KEY, response.data)
        self.assertIn(TAKEN_SEAT_IDS_KEY, response.data)
        self.assertEqual(response.data[TAKEN_SEAT_IDS_KEY], [self.seat_vip.id])

    def test_verify_ticket_invalid_qr_returns_400(self):
        response = self.client.post(
            reverse('verify-ticket'),
            {'qr_data': 'invalid'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[VALID_KEY], False)
        self.assertIn(ERROR_KEY, response.data)

    def test_verify_ticket_not_found_returns_404(self):
        qr_data = generate_qr_data(ticket_id=uuid.uuid4(), booking_id=123)
        response = self.client.post(reverse('verify-ticket'), {'qr_data': qr_data}, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data[VALID_KEY], False)
        self.assertIn(ERROR_KEY, response.data)

    def test_verify_ticket_cancelled_booking_returns_invalid(self):
        booking = Booking.objects.create(
            event=self.event,
            customer_name='Carl',
            phone_number='+1333',
            status=BookingStatus.CANCELLED,
            total_price='100.00',
        )
        ticket = Ticket.objects.create(booking=booking)
        ticket.generate_qr_data()
        ticket.save(update_fields=['qr_data'])

        response = self.client.post(reverse('verify-ticket'), {'qr_data': ticket.qr_data}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[VALID_KEY], False)
        self.assertIn(ERROR_KEY, response.data)

    def test_verify_ticket_unpaid_booking_returns_invalid(self):
        booking = Booking.objects.create(
            event=self.event,
            customer_name='Dina',
            phone_number='+1444',
            status=BookingStatus.PENDING,
            total_price='100.00',
        )
        ticket = Ticket.objects.create(booking=booking)
        ticket.generate_qr_data()
        ticket.save(update_fields=['qr_data'])

        response = self.client.post(reverse('verify-ticket'), {'qr_data': ticket.qr_data}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[VALID_KEY], False)
        self.assertIn(ERROR_KEY, response.data)

    def test_verify_ticket_already_scanned_returns_invalid(self):
        booking = Booking.objects.create(
            event=self.event,
            customer_name='Eva',
            phone_number='+1555',
            status=BookingStatus.PAID,
            total_price='100.00',
        )
        ticket = Ticket.objects.create(
            booking=booking,
            is_scanned=True,
            scanned_at=timezone.now(),
        )
        ticket.generate_qr_data()
        ticket.save(update_fields=['qr_data'])

        response = self.client.post(reverse('verify-ticket'), {'qr_data': ticket.qr_data}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[VALID_KEY], False)
        self.assertIn(ERROR_KEY, response.data)

    def test_verify_ticket_consume_marks_ticket_scanned(self):
        booking = Booking.objects.create(
            event=self.event,
            customer_name='Fiona',
            phone_number='+1666',
            status=BookingStatus.PAID,
            total_price='100.00',
        )
        ticket = Ticket.objects.create(booking=booking)
        ticket.generate_qr_data()
        ticket.save(update_fields=['qr_data'])

        response = self.client.post(
            reverse('verify-ticket'),
            {'qr_data': ticket.qr_data, 'consume': True},
            format='json',
        )
        ticket.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[VALID_KEY], True)
        self.assertEqual(response.data[CONSUMED_KEY], True)
        self.assertTrue(ticket.is_scanned)
        self.assertIsNotNone(ticket.scanned_at)

    def test_public_booking_detail_uses_ticket_token(self):
        response = self.client.post(
            reverse('create-booking'),
            self._create_booking_payload([self.seat_vip.id]),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        public_token = response.data['public_token']
        public_response = self.client.get(
            reverse('public-booking-detail', kwargs={'token': public_token}),
        )

        self.assertEqual(public_response.status_code, status.HTTP_200_OK)
        self.assertEqual(public_response.data['public_token'], public_token)


class ArchitectureGuardTests(APITestCase):
    def test_runtime_booking_code_has_no_status_magic_literals(self):
        bookings_dir = Path(__file__).resolve().parent
        allowed_files = {
            bookings_dir / 'domain' / 'constants.py',
        }
        forbidden_literals = {"'pending'", "'paid'", "'cancelled'"}

        for py_file in bookings_dir.rglob('*.py'):
            if (
                'migrations' in py_file.parts
                or 'tests' in py_file.parts
                or py_file.name == 'tests.py'
                or py_file.name.startswith('test_')
            ):
                continue
            if py_file in allowed_files:
                continue

            content = py_file.read_text(encoding='utf-8')
            for literal in forbidden_literals:
                self.assertNotIn(
                    literal,
                    content,
                    msg=f'Found magic status literal {literal} in {py_file}',
                )
