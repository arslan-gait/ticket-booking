"use client";

import { useEffect, useState } from "react";
import { getBookings, updateBookingStatus, type BookingListItem } from "@/lib/api";

export default function AdminBookingsManager() {
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
          Filter status:
        </label>
        <select
          id="status"
          className="rounded border border-slate-600 bg-slate-900 p-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="pending">pending</option>
          <option value="paid">paid</option>
          <option value="cancelled">cancelled</option>
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
                <p className="text-sm text-slate-300">
                  {booking.event_name} · {new Date(booking.event_date).toLocaleString()}
                </p>
                <p className="text-sm text-slate-300">
                  {booking.phone_number} · seats: {booking.seat_count} · total: ${booking.total_price}
                </p>
                <p className="text-xs text-slate-400">status: {booking.status}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="button button-primary"
                  disabled={booking.status === "paid"}
                  onClick={() => markStatus(booking.id, "paid")}
                >
                  Mark paid
                </button>
                <button
                  className="button button-secondary"
                  disabled={booking.status === "cancelled"}
                  onClick={() => markStatus(booking.id, "cancelled")}
                >
                  Cancel
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
