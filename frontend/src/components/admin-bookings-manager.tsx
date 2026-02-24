"use client";

import { useEffect, useState } from "react";
import { getBookings, updateBookingStatus, type BookingListItem } from "@/lib/api";
import { useAppSettings } from "@/components/app-settings-provider";

export default function AdminBookingsManager() {
  const { tr } = useAppSettings();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await getBookings({ status: statusFilter || undefined });
    setBookings(data);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, [statusFilter]);

  async function markStatus(id: number, status: "paid" | "cancelled") {
    try {
      await updateBookingStatus(id, status);
      await load();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-2 p-4">
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
      </div>
      <div className="space-y-2">
        {bookings.map((booking) => (
          <div key={booking.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  #{booking.id} · {booking.customer_name}
                </p>
                <p className="muted text-sm">
                  {booking.event_name} · {new Date(booking.event_date).toLocaleString()}
                </p>
                <p className="muted text-sm">
                  {booking.phone_number} · {tr("seatsCount")}: {booking.seat_count} · {tr("total")}: $
                  {booking.total_price}
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
                  onClick={() => markStatus(booking.id, "cancelled")}
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
