"use client";

import { useEffect, useState } from "react";
import {
  getAdminEvents,
  getBookings,
  getEventSeats,
  updateBookingStatus,
  type BookingListItem,
  type EventItem,
  type EventSeatsResponse,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import SeatPicker from "@/components/seat-picker";
import { useAppSettings } from "@/components/app-settings-provider";

export default function AdminBookingsManager() {
  const { tr } = useAppSettings();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [whatsappFilter, setWhatsappFilter] = useState("");
  const [eventSeats, setEventSeats] = useState<EventSeatsResponse | null>(null);
  const [error, setError] = useState("");

  async function loadBookings() {
    const data = await getBookings({
      event: eventFilter ? Number(eventFilter) : undefined,
      status: statusFilter || undefined,
    });
    setBookings(data);
  }

  async function loadEvents() {
    const data = await getAdminEvents();
    setEvents(data);
  }

  async function loadEventSeats() {
    if (!eventFilter) {
      setEventSeats(null);
      return;
    }
    const data = await getEventSeats(Number(eventFilter));
    setEventSeats(data);
  }

  useEffect(() => {
    loadEvents().catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    loadBookings().catch((e) => setError(String(e)));
  }, [statusFilter, eventFilter]);

  useEffect(() => {
    loadEventSeats().catch((e) => setError(String(e)));
  }, [eventFilter]);

  async function markStatus(id: number, status: "paid" | "cancelled") {
    try {
      await updateBookingStatus(id, status);
      await loadBookings();
      await loadEventSeats();
    } catch (e) {
      setError(String(e));
    }
  }

  function confirmCancelBooking(id: number) {
    const confirmed = window.confirm("Are you sure you want to cancel this booking?");
    if (!confirmed) return;
    markStatus(id, "cancelled").catch((e) => setError(String(e)));
  }

  const normalizedWhatsappFilter = whatsappFilter.replace(/\D/g, "");
  const filteredBookings = bookings.filter((booking) => {
    const matchesName = booking.customer_name.toLowerCase().includes(nameFilter.toLowerCase().trim());
    const bookingPhone = booking.phone_number.replace(/\D/g, "");
    const matchesWhatsapp =
      normalizedWhatsappFilter.length === 0 || bookingPhone.includes(normalizedWhatsappFilter);
    return matchesName && matchesWhatsapp;
  });

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-4">
        <label htmlFor="event" className="text-sm">
          {tr("event")}:
        </label>
        <select
          id="event"
          className="input-field w-auto"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option value="">{tr("all")}</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
        <label htmlFor="status" className="text-sm">
          {tr("filterStatus")}:
        </label>
        <select
          id="status"
          className="input-field w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{tr("all")}</option>
          <option value="pending">{tr("pending")}</option>
          <option value="paid">{tr("paid")}</option>
          <option value="cancelled">{tr("cancelled")}</option>
        </select>
        <label htmlFor="name-filter" className="text-sm">
          {tr("name")}:
        </label>
        <input
          id="name-filter"
          className="input-field w-44"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
        <label htmlFor="whatsapp-filter" className="text-sm">
          {tr("whatsapp")}:
        </label>
        <input
          id="whatsapp-filter"
          className="input-field w-44"
          value={whatsappFilter}
          onChange={(e) => setWhatsappFilter(e.target.value)}
        />
      </div>
      {eventSeats ? (
        <div className="card space-y-3 p-4">
          <p className="text-sm font-semibold">
            {tr("venueLabel")}: {eventSeats.venue.name}
          </p>
          <SeatPicker
            seats={eventSeats.seats}
            selectedSeatIds={[]}
            onToggleSeat={() => {}}
            priceTiers={eventSeats.price_tiers}
            layoutMeta={eventSeats.venue.layout_meta}
            adminView
          />
        </div>
      ) : null}
      <div className="space-y-2">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  #{booking.id} · {booking.customer_name}
                </p>
                <p className="muted text-sm">
                  {booking.event_name} · {formatDateTime(booking.event_date)}
                </p>
                <p className="muted text-sm">
                  {booking.phone_number} · {tr("seatsCount")}: {booking.seat_count} · {tr("total")}:{" "}
                  {booking.total_price} ₸
                </p>
                <p className="muted text-xs">
                  {tr("status")}: {booking.status}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="button button-primary"
                  disabled={booking.status === "paid"}
                  onClick={() => markStatus(booking.id, "paid")}
                >
                  {tr("markPaid")}
                </button>
                <button
                  className="button button-secondary"
                  disabled={booking.status === "cancelled"}
                  onClick={() => confirmCancelBooking(booking.id)}
                >
                  {tr("cancel")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
