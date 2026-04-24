from rest_framework import viewsets

from common.viewset_mixins import ActionSerializerMixin

from .models import Event, Venue
from .serializers import (
    EventDetailSerializer,
    EventListSerializer,
    EventWriteSerializer,
    VenueDetailSerializer,
    VenueListSerializer,
    VenueWriteSerializer,
)


class VenueViewSet(ActionSerializerMixin, viewsets.ModelViewSet):
    queryset = Venue.objects.prefetch_related('seats').all()
    default_serializer_class = VenueDetailSerializer
    serializer_action_classes = {
        'list': VenueListSerializer,
        'create': VenueWriteSerializer,
        'update': VenueWriteSerializer,
        'partial_update': VenueWriteSerializer,
    }


class EventViewSet(ActionSerializerMixin, viewsets.ModelViewSet):
    queryset = Event.objects.select_related('venue').all()
    default_serializer_class = EventDetailSerializer
    serializer_action_classes = {
        'list': EventListSerializer,
        'create': EventWriteSerializer,
        'update': EventWriteSerializer,
        'partial_update': EventWriteSerializer,
    }

    def get_queryset(self):
        qs = super().get_queryset()
        include_inactive = self.request.query_params.get('include_inactive') == '1'
        if self.action == 'list' and not include_inactive:
            qs = qs.filter(is_active=True)
        return qs
