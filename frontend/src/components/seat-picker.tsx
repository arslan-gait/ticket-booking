"use client";

import { useMemo } from "react";
import type { SeatItem } from "@/lib/api";
import { useAppSettings } from "@/components/app-settings-provider";

type Props = {
  seats: SeatItem[];
  selectedSeatIds: number[];
  onToggleSeat: (seatId: number) => void;
  priceTiers: Record<string, number>;
};

const TYPE_COLORS = [
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-cyan-400",
  "bg-sky-400",
  "bg-indigo-400",
  "bg-violet-400",
  "bg-fuchsia-400",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seatClass(
  seatType: string,
  status: SeatItem["status"],
  isSelected: boolean,
): string {
  if (isSelected) return "bg-purple-600 text-white ring-2 ring-purple-300";

  const typeClass = TYPE_COLORS[hashString(seatType) % TYPE_COLORS.length];
  if (status === "open") return `${typeClass} text-slate-900`;
  if (status === "booked") return "bg-slate-400 text-slate-700";
  return "bg-slate-700 text-slate-100";
}

export default function SeatPicker({ seats, selectedSeatIds, onToggleSeat, priceTiers }: Props) {
  const { tr } = useAppSettings();
  const typeLegend = useMemo(() => Object.keys(priceTiers), [priceTiers]);
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
              className={`rounded p-2 text-xs ${seatClass(seat.seat_type, seat.status, selected)} ${
                disabled ? "opacity-70" : ""
              }`}
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
      <div className="card p-3 text-xs">
        <p className="mb-2 font-semibold">{tr("typeColors")}</p>
        <div className="flex flex-wrap gap-2">
          {typeLegend.map((seatType) => {
            const colorClass = TYPE_COLORS[hashString(seatType) % TYPE_COLORS.length];
            return (
              <span key={seatType} className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
                <span className={`inline-block h-3 w-3 rounded ${colorClass}`} />
                {seatType}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
            <span className="inline-block h-3 w-3 rounded bg-slate-400" />
            {tr("bookedSeat")}
          </span>
          <span className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
            <span className="inline-block h-3 w-3 rounded bg-slate-700" />
            {tr("paidSeat")}
          </span>
          <span className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
            <span className="inline-block h-3 w-3 rounded bg-purple-600" />
            {tr("selectedSeat")}
          </span>
        </div>
      </div>
      <div className="card p-3 text-sm">
        <p>
          {tr("selectedSeats")}: <b>{selectedSeatIds.length}</b>
        </p>
        <p>
          {tr("total")}: <b>${selectedTotal.toFixed(2)}</b>
        </p>
      </div>
    </div>
  );
}
