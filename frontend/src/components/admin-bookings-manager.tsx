"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminEvents,
  getBookings,
  getEventSeats,
  toErrorMessage,
  updateBookingStatus,
  type BookingListItem,
  type EventItem,
  type EventSeatsResponse,
} from "@/lib/api";
import LocalDateTime from "@/components/local-date-time";
import SeatPicker from "@/components/seat-picker";
import { useAppSettings } from "@/components/app-settings-provider";
import CancelBookingDialog from "@/components/cancel-booking-dialog";

export default function AdminBookingsManager() {
  const { tr } = useAppSettings();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [whatsappFilter, setWhatsappFilter] = useState("");
  const [eventSeats, setEventSeats] = useState<EventSeatsResponse | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
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
    loadEvents().catch((e) => setError(toErrorMessage(e)));
  }, []);

  useEffect(() => {
    loadBookings().catch((e) => setError(toErrorMessage(e)));
  }, [statusFilter, eventFilter]);

  useEffect(() => {
    loadEventSeats().catch((e) => setError(toErrorMessage(e)));
  }, [eventFilter]);

  async function markStatus(id: number, status: "paid" | "cancelled", commentary?: string) {
    try {
      await updateBookingStatus(id, status, commentary);
      await loadBookings();
      await loadEventSeats();
    } catch (e) {
      setError(toErrorMessage(e));
    }
  }

  async function handleCancelConfirm(commentary: string) {
    if (cancellingId === null) return;
    setCancellingId(null);
    await markStatus(cancellingId, "cancelled", commentary);
  }

  const normalizedWhatsappFilter = whatsappFilter.replace(/\D/g, "");
  const normalizeStatus = (status: string) => status.trim().toLowerCase();
  const getTranslatedStatus = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    if (normalizedStatus === "pending" || normalizedStatus === "paid" || normalizedStatus === "cancelled") {
      return tr(normalizedStatus);
    }
    return status;
  };
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
        {filteredBookings.map((booking) => {
          const isPaid = normalizeStatus(booking.status) === "paid";
          const isPending = normalizeStatus(booking.status) === "pending";
          const isCancelled = normalizeStatus(booking.status) === "cancelled";
          return (
          <div
            key={booking.id}
            className="card cursor-pointer p-4 transition-colors hover:bg-[var(--background)]/40"
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/booking/${booking.public_token}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/booking/${booking.public_token}`);
              }
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  #{booking.id} · {booking.customer_name}
                </p>
                <p className="muted text-sm">
                  {booking.event_name} · {<LocalDateTime value={booking.event_date} />}
                </p>
                <p className="muted text-sm">
                  {booking.phone_number} · {tr("seatsCount")}: {booking.seat_count} · {tr("total")}:{" "}
                  {booking.total_price} ₸
                </p>
                <p className="muted text-xs">
                  {tr("status")}: {getTranslatedStatus(booking.status)}
                </p>
                {booking.commentary && (
                  <p className="muted text-xs">
                    {tr("commentary")}: {booking.commentary}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className={`button ${isPending ? "button-primary" : "button-secondary"}`}
                  disabled={!isPending}
                  aria-disabled={!isPending}
                  style={{ pointerEvents: isPending ? "auto" : "none" }}
                  onClick={
                    isPending
                      ? (event) => {
                          event.stopPropagation();
                          markStatus(booking.id, "paid");
                        }
                      : undefined
                  }
                >
                  {tr("markPaid")}
                </button>
                <button
                  className="button button-danger"
                  disabled={isCancelled}
                  onClick={(event) => {
                    event.stopPropagation();
                    setCancellingId(booking.id);
                  }}
                >
                  {tr("cancel")}
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {cancellingId !== null && (
        <CancelBookingDialog
          onConfirm={handleCancelConfirm}
          onClose={() => setCancellingId(null)}
        />
      )}
    </div>
  );
}
