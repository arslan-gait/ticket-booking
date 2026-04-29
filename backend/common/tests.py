from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class StaffJwtAuthTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.staff_user = user_model.objects.create_user(
            username='active-staff',
            password='staff-pass',
            is_active=True,
            is_staff=True,
        )
        self.non_staff_user = user_model.objects.create_user(
            username='customer-user',
            password='customer-pass',
            is_active=True,
            is_staff=False,
        )
        self.inactive_staff_user = user_model.objects.create_user(
            username='inactive-staff',
            password='inactive-pass',
            is_active=False,
            is_staff=True,
        )

    def test_staff_login_returns_access_and_refresh(self):
        response = self.client.post(
            reverse('auth-login'),
            {'username': self.staff_user.username, 'password': 'staff-pass'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], self.staff_user.username)
        self.assertTrue(response.data['user']['is_staff'])
        self.assertTrue(response.data['user']['is_active'])

    def test_non_staff_login_is_rejected(self):
        response = self.client.post(
            reverse('auth-login'),
            {'username': self.non_staff_user.username, 'password': 'customer-pass'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_staff_login_is_rejected(self):
        response = self.client.post(
            reverse('auth-login'),
            {'username': self.inactive_staff_user.username, 'password': 'inactive-pass'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_requires_active_staff_token(self):
        login_response = self.client.post(
            reverse('auth-login'),
            {'username': self.staff_user.username, 'password': 'staff-pass'},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        me_response = self.client.get(reverse('auth-me'))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data['username'], self.staff_user.username)
