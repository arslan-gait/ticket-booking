"use client";

import { useMemo } from "react";
import type { SeatItem } from "@/lib/api";

type Props = {
  seats: SeatItem[];
  selectedSeatIds: number[];
  onToggleSeat: (seatId: number) => void;
  priceTiers: Record<string, number>;
};

function seatColor(status: SeatItem["status"], isSelected: boolean): string {
  if (isSelected) return "bg-purple-500";
  if (status === "open") return "bg-green-600";
  if (status === "booked") return "bg-yellow-500";
  return "bg-blue-600";
}

export default function SeatPicker({ seats, selectedSeatIds, onToggleSeat, priceTiers }: Props) {
  const selectedTotal = useMemo(() => {
    return seats
      .filter((s) => selectedSeatIds.includes(s.id))
      .reduce((sum, s) => sum + (priceTiers[s.seat_type] ?? 0), 0);
  }, [seats, selectedSeatIds, priceTiers]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2 md:grid-cols-10">
        {seats.map((seat) => {
          const selected = selectedSeatIds.includes(seat.id);
          const disabled = seat.status !== "open";
          return (
            <button
              key={seat.id}
              type="button"
              className={`rounded p-2 text-xs ${seatColor(seat.status, selected)} ${disabled ? "opacity-60" : ""}`}
              disabled={disabled}
              onClick={() => onToggleSeat(seat.id)}
              title={`${seat.section} ${seat.row_label}-${seat.seat_number}`}
            >
              {seat.row_label}
              {seat.seat_number}
            </button>
          );
        })}
      </div>
      <div className="card p-3 text-sm">
        <p>
          Selected seats: <b>{selectedSeatIds.length}</b>
        </p>
        <p>
          Total: <b>${selectedTotal.toFixed(2)}</b>
        </p>
      </div>
    </div>
  );
}
