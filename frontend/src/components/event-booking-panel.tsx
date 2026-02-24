"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking, toErrorMessage, type SeatItem } from "@/lib/api";
import SeatPicker from "@/components/seat-picker";
import { useAppSettings } from "@/components/app-settings-provider";

type Props = {
  eventId: number;
  seats: SeatItem[];
  priceTiers: Record<string, number>;
  layoutMeta: Record<string, unknown>;
};

export default function EventBookingPanel({ eventId, seats, priceTiers, layoutMeta }: Props) {
  const router = useRouter();
  const { tr } = useAppSettings();
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasSelectedSeats = selectedSeatIds.length > 0;
  const hasCustomerName = customerName.trim().length > 1;
  const hasPhone = phone.trim().length > 5;
  const canSubmit = useMemo(
    () => hasSelectedSeats && hasCustomerName && hasPhone,
    [hasCustomerName, hasPhone, hasSelectedSeats],
  );

  function toggleSeat(seatId: number) {
    setError("");
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId],
    );
  }

  function clearSelections() {
    setError("");
    setSelectedSeatIds([]);
  }

  async function submit() {
    if (loading) return;
    if (!canSubmit) {
      if (!hasSelectedSeats) {
        setError(tr("selectSeatsRequired"));
      } else if (!hasCustomerName) {
        setError(tr("nameRequired"));
      } else {
        setError(tr("phoneRequired"));
      }
      return;
    }
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
      setError(toErrorMessage(err));
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
        onClearSelection={clearSelections}
        priceTiers={priceTiers}
        layoutMeta={layoutMeta}
        adminView={false}
      />
      <div className="card space-y-3 p-4">
        <h3 className="font-semibold">{tr("yourDetails")}</h3>
        <input
          className="input-field"
          placeholder={tr("fullName")}
          value={customerName}
          onChange={(e) => {
            setError("");
            setCustomerName(e.target.value);
          }}
        />
        <input
          className="input-field"
          placeholder={tr("whatsappNumber")}
          value={phone}
          onChange={(e) => {
            setError("");
            setPhone(e.target.value);
          }}
        />
        <button className="button button-primary" disabled={loading} onClick={submit}>
          {loading ? tr("createBooking") : tr("confirmBooking")}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
