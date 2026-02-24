from django.contrib import admin

from .models import Event, Seat, Venue


class SeatInline(admin.TabularInline):
    model = Seat
    extra = 0


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    inlines = [SeatInline]


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'venue', 'date', 'is_active']
    list_filter = ['is_active', 'venue']
