from django.contrib import admin

from .models import Booking, BookingItem, Ticket


class BookingItemInline(admin.TabularInline):
    model = BookingItem
    extra = 0
    readonly_fields = ['seat', 'price']


class TicketInline(admin.StackedInline):
    model = Ticket
    extra = 0
    readonly_fields = ['token', 'qr_data', 'is_scanned', 'scanned_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['customer_name', 'event', 'status', 'total_price', 'created_at']
    list_filter = ['status', 'event']
    inlines = [BookingItemInline, TicketInline]
