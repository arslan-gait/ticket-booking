from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Venue


class VenueSeatSyncTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.staff_user = user_model.objects.create_user(
            username='staff',
            password='staff-pass',
            is_staff=True,
        )
        self.client.force_authenticate(user=self.staff_user)

    def test_update_venue_replaces_seats(self):
        create_payload = {
            'name': 'Main Hall',
            'description': 'test',
            'layout_meta': {'width': 400, 'height': 300},
            'seats': [
                {
                    'label': 'A1',
                    'cx': 10,
                    'cy': 10,
                    'section': 'A',
                    'row_label': '1',
                    'seat_number': 1,
                    'seat_type': 'regular',
                },
                {
                    'label': 'A2',
                    'cx': 20,
                    'cy': 10,
                    'section': 'A',
                    'row_label': '1',
                    'seat_number': 2,
                    'seat_type': 'regular',
                },
            ],
        }
        create_response = self.client.post(reverse('venue-list'), create_payload, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        venue = Venue.objects.get(id=create_response.data['id'])
        original_seat_ids = set(venue.seats.values_list('id', flat=True))
        self.assertEqual(len(original_seat_ids), 2)

        update_payload = {
            'name': 'Main Hall Updated',
            'description': 'updated',
            'layout_meta': {'width': 500, 'height': 350},
            'seats': [
                {
                    'label': 'B1',
                    'cx': 30,
                    'cy': 20,
                    'section': 'B',
                    'row_label': '2',
                    'seat_number': 1,
                    'seat_type': 'vip',
                },
            ],
        }
        detail_url = reverse('venue-detail', kwargs={'pk': venue.id})
        update_response = self.client.put(detail_url, update_payload, format='json')
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        venue.refresh_from_db()
        new_seat_ids = set(venue.seats.values_list('id', flat=True))
        self.assertEqual(len(new_seat_ids), 1)
        self.assertTrue(original_seat_ids.isdisjoint(new_seat_ids))
