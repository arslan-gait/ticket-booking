"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking, type SeatItem } from "@/lib/api";
import SeatPicker from "@/components/seat-picker";

type Props = {
  eventId: number;
  seats: SeatItem[];
  priceTiers: Record<string, number>;
};

export default function EventBookingPanel({ eventId, seats, priceTiers }: Props) {
  const router = useRouter();
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => selectedSeatIds.length > 0 && customerName.trim().length > 1 && phone.trim().length > 5,
    [selectedSeatIds, customerName, phone],
  );

  function toggleSeat(seatId: number) {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId],
    );
  }

  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");
    try {
      const booking = await createBooking({
        event_id: eventId,
        customer_name: customerName.trim(),
        phone_number: phone.trim(),
        seat_ids: selectedSeatIds,
      });
      router.push(`/booking/${booking.id}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SeatPicker
        seats={seats}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={toggleSeat}
        priceTiers={priceTiers}
      />
      <div className="card space-y-3 p-4">
        <h3 className="font-semibold">Your details</h3>
        <input
          className="w-full rounded border border-slate-600 bg-slate-900 p-2"
          placeholder="Full name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          className="w-full rounded border border-slate-600 bg-slate-900 p-2"
          placeholder="WhatsApp number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="button button-primary" disabled={!canSubmit || loading} onClick={submit}>
          {loading ? "Creating booking..." : "Confirm booking"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
