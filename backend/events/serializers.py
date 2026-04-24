from django.conf import settings
from rest_framework import serializers

from .models import Event, Seat, Venue


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ['id', 'label', 'cx', 'cy', 'section', 'row_label', 'seat_number', 'seat_type']


class VenueListSerializer(serializers.ModelSerializer):
    seat_count = serializers.IntegerField(source='seats.count', read_only=True)

    class Meta:
        model = Venue
        fields = ['id', 'name', 'address_line', 'description', 'seat_count', 'created_at']


class VenueDetailSerializer(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, read_only=True)

    class Meta:
        model = Venue
        fields = ['id', 'name', 'address_line', 'description', 'layout_meta', 'seats', 'created_at', 'updated_at']


class VenueWriteSerializer(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, required=False)

    class Meta:
        model = Venue
        fields = ['id', 'name', 'address_line', 'description', 'layout_meta', 'seats']

    @staticmethod
    def _create_seats(venue, seats_data):
        for seat_data in seats_data:
            Seat.objects.create(venue=venue, **seat_data)

    def create(self, validated_data):
        seats_data = validated_data.pop('seats', [])
        venue = Venue.objects.create(**validated_data)
        self._create_seats(venue, seats_data)
        return venue

    def update(self, instance, validated_data):
        seats_data = validated_data.pop('seats', None)
        instance.name = validated_data.get('name', instance.name)
        instance.address_line = validated_data.get('address_line', instance.address_line)
        instance.description = validated_data.get('description', instance.description)
        instance.layout_meta = validated_data.get('layout_meta', instance.layout_meta)
        instance.save()

        if seats_data is not None:
            instance.seats.all().delete()
            self._create_seats(instance, seats_data)

        return instance


class EventListSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        if not obj.image:
            return None
        image_url = obj.image.url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(image_url)

        backend_base_url = settings.BACKEND_BASE_URL
        if backend_base_url:
            return f"{backend_base_url}/{image_url.lstrip('/')}"

        return image_url if image_url.startswith("/") else f"/{image_url}"

    class Meta:
        model = Event
        fields = ['id', 'name', 'description', 'image', 'date', 'venue', 'venue_name', 'price_tiers', 'is_active']


class EventDetailSerializer(serializers.ModelSerializer):
    venue = VenueDetailSerializer(read_only=True)
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        if not obj.image:
            return None
        image_url = obj.image.url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(image_url)

        backend_base_url = settings.BACKEND_BASE_URL
        if backend_base_url:
            return f"{backend_base_url}/{image_url.lstrip('/')}"

        return image_url if image_url.startswith("/") else f"/{image_url}"

    class Meta:
        model = Event
        fields = ['id', 'name', 'description', 'image', 'date', 'venue', 'price_tiers', 'is_active', 'created_at']


class EventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'name', 'description', 'image', 'date', 'venue', 'price_tiers', 'is_active']
