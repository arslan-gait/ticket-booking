from rest_framework import viewsets

from .models import Event, Venue
from .serializers import (
    EventDetailSerializer,
    EventListSerializer,
    EventWriteSerializer,
    VenueDetailSerializer,
    VenueListSerializer,
    VenueWriteSerializer,
)


class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.prefetch_related('seats').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return VenueListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return VenueWriteSerializer
        return VenueDetailSerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related('venue').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return EventWriteSerializer
        return EventDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            qs = qs.filter(is_active=True)
        return qs
