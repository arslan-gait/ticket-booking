from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BookingViewSet, create_booking, event_seat_availability, public_booking_detail, verify_ticket

router = DefaultRouter()
router.register(r'bookings', BookingViewSet)

urlpatterns = [
    path('bookings/create/', create_booking, name='create-booking'),
    path('bookings/public/<uuid:token>/', public_booking_detail, name='public-booking-detail'),
    path('events/<int:event_id>/seats/', event_seat_availability, name='event-seats'),
    path('tickets/verify/', verify_ticket, name='verify-ticket'),
    path('', include(router.urls)),
]
