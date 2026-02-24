"use client";

import { useMemo } from "react";
import type { SeatItem } from "@/lib/api";
import { useAppSettings } from "@/components/app-settings-provider";

type Props = {
  seats: SeatItem[];
  selectedSeatIds: number[];
  onToggleSeat: (seatId: number) => void;
  priceTiers: Record<string, number>;
  layoutMeta: Record<string, unknown>;
};

const TYPE_COLORS = [
  "#fb7185",
  "#f59e0b",
  "#34d399",
  "#22d3ee",
  "#38bdf8",
  "#6366f1",
  "#a78bfa",
  "#e879f9",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

type LayoutMeta = {
  width?: number;
  height?: number;
  background?: string;
  type_colors?: Record<string, string>;
  stage?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    label?: string;
    background?: string;
    color?: string;
  };
};

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getSeatColor(key: string, customColors: Record<string, string>): string {
  const normalized = key.toLowerCase();
  const custom = customColors[normalized] || customColors[key];
  if (custom) return custom;
  return TYPE_COLORS[hashString(normalized) % TYPE_COLORS.length];
}

export default function SeatPicker({ seats, selectedSeatIds, onToggleSeat, priceTiers, layoutMeta }: Props) {
  const { tr } = useAppSettings();
  const sectionLegend = useMemo(() => {
    const uniqueSections = new Set(
      seats
        .map((seat) => seat.section?.trim())
        .filter((section): section is string => Boolean(section)),
    );
    return Array.from(uniqueSections).sort((a, b) => a.localeCompare(b));
  }, [seats]);
  const selectedTotal = useMemo(() => {
    return seats
      .filter((s) => selectedSeatIds.includes(s.id))
      .reduce((sum, s) => sum + (priceTiers[s.seat_type] ?? 0), 0);
  }, [seats, selectedSeatIds, priceTiers]);
  const takenSeats = useMemo(
    () =>
      seats
        .filter((seat) => seat.status === "booked" || seat.status === "paid")
        .sort((a, b) => {
          const sectionCompare = (a.section || "").localeCompare(b.section || "", undefined, { numeric: true });
          if (sectionCompare !== 0) return sectionCompare;
          const rowCompare = (a.row_label || "").localeCompare(b.row_label || "", undefined, { numeric: true });
          if (rowCompare !== 0) return rowCompare;
          return a.seat_number - b.seat_number;
        }),
    [seats],
  );
  const parsedLayoutMeta = (layoutMeta || {}) as LayoutMeta;
  const customSectionColors = useMemo(() => parsedLayoutMeta.type_colors || {}, [parsedLayoutMeta.type_colors]);

  const defaultWidth = 900;
  const defaultHeight = 500;
  const padding = 32;
  const seatRadius = 13;
  const leftRowLabelGap = 7;
  const rowLabelVerticalOffset = 6;
  const rowLabelLeftViewportReserve = 140;
  const rowLabelRightViewportReserve = 90;
  const sectionLabelTopReserve = 48;
  const sectionLabelVerticalOffset = 38;

  const stageConfig = useMemo(() => {
    const stage = parsedLayoutMeta.stage;
    return {
      x: toFiniteNumber(stage?.x, 120),
      y: toFiniteNumber(stage?.y, 20),
      width: Math.max(120, toFiniteNumber(stage?.width, 660)),
      height: Math.max(36, toFiniteNumber(stage?.height, 64)),
      label: stage?.label?.trim() ? stage.label : "СЦЕНА",
      background: stage?.background || "#1e293b",
      color: stage?.color || "#f8fafc",
    };
  }, [parsedLayoutMeta.stage]);

  const normalizedSeats = useMemo(
    () =>
      seats.filter((seat) => Number.isFinite(seat.cx) && Number.isFinite(seat.cy)),
    [seats],
  );

  const viewport = useMemo(() => {
    const seatMinX = normalizedSeats.length
      ? Math.min(...normalizedSeats.map((seat) => seat.cx - seatRadius), stageConfig.x)
      : stageConfig.x;
    const seatMaxX = normalizedSeats.length
      ? Math.max(...normalizedSeats.map((seat) => seat.cx + seatRadius), stageConfig.x + stageConfig.width)
      : stageConfig.x + stageConfig.width;
    const seatMinY = normalizedSeats.length
      ? Math.min(...normalizedSeats.map((seat) => seat.cy - seatRadius), stageConfig.y)
      : stageConfig.y;
    const seatMaxY = normalizedSeats.length
      ? Math.max(...normalizedSeats.map((seat) => seat.cy + seatRadius), stageConfig.y + stageConfig.height)
      : stageConfig.y + stageConfig.height;

    const minX = Math.min(seatMinX - rowLabelLeftViewportReserve, stageConfig.x);
    const maxX = Math.max(seatMaxX + rowLabelRightViewportReserve, stageConfig.x + stageConfig.width);
    const minY = Math.min(seatMinY - sectionLabelTopReserve, stageConfig.y);
    const maxY = Math.max(seatMaxY, stageConfig.y + stageConfig.height);

    const preferredWidth = Math.max(defaultWidth, toFiniteNumber(parsedLayoutMeta.width, defaultWidth));
    const preferredHeight = Math.max(defaultHeight, toFiniteNumber(parsedLayoutMeta.height, defaultHeight));

    return {
      width: Math.max(preferredWidth, Math.ceil(maxX - minX + padding * 2)),
      height: Math.max(preferredHeight, Math.ceil(maxY - minY + padding * 2)),
      offsetX: padding - minX + seatRadius,
      offsetY: padding - minY + seatRadius,
    };
  }, [
    defaultHeight,
    defaultWidth,
    normalizedSeats,
    padding,
    parsedLayoutMeta.height,
    parsedLayoutMeta.width,
    rowLabelLeftViewportReserve,
    rowLabelRightViewportReserve,
    sectionLabelTopReserve,
    seatRadius,
    stageConfig,
  ]);

  const rowLabels = useMemo(() => {
    const rowMergeTolerance = 28;
    const groupedSeats = new Map<string, SeatItem[]>();

    for (const seat of normalizedSeats) {
      const rowKey = seat.row_label?.trim();
      if (!rowKey) continue;
      const sectionKey = seat.section?.trim() || "_";
      const groupKey = `${sectionKey}::${rowKey}`;
      const group = groupedSeats.get(groupKey) ?? [];
      group.push(seat);
      groupedSeats.set(groupKey, group);
    }

    const clusters: Array<{ label: string; minX: number; maxX: number; centerY: number; count: number }> = [];

    for (const [groupKey, groupSeats] of groupedSeats.entries()) {
      const label = groupKey.split("::")[1];
      const sortedByY = [...groupSeats].sort((a, b) => a.cy - b.cy);
      const localClusters: Array<{ label: string; minX: number; maxX: number; centerY: number; count: number }> = [];

      for (const seat of sortedByY) {
        const existing = localClusters.find((cluster) => Math.abs(cluster.centerY - seat.cy) <= rowMergeTolerance);
        if (!existing) {
          localClusters.push({
            label,
            minX: seat.cx,
            maxX: seat.cx,
            centerY: seat.cy,
            count: 1,
          });
          continue;
        }

        existing.minX = Math.min(existing.minX, seat.cx);
        existing.maxX = Math.max(existing.maxX, seat.cx);
        existing.centerY = (existing.centerY * existing.count + seat.cy) / (existing.count + 1);
        existing.count += 1;
      }

      clusters.push(...localClusters);
    }

    return clusters.sort((a, b) => a.centerY - b.centerY);
  }, [normalizedSeats]);

  const sectionLabels = useMemo(() => {
    const sections = new Map<string, { minX: number; maxX: number; minY: number }>();

    for (const seat of normalizedSeats) {
      const sectionName = seat.section?.trim();
      if (!sectionName) continue;
      const current = sections.get(sectionName);
      if (!current) {
        sections.set(sectionName, { minX: seat.cx, maxX: seat.cx, minY: seat.cy });
        continue;
      }
      current.minX = Math.min(current.minX, seat.cx);
      current.maxX = Math.max(current.maxX, seat.cx);
      current.minY = Math.min(current.minY, seat.cy);
    }

    return Array.from(sections.entries())
      .map(([name, bounds]) => ({ name, ...bounds }))
      .sort((a, b) => a.minY - b.minY);
  }, [normalizedSeats]);

  return (
    <div className="space-y-4">
      <div className="overflow-auto card p-2">
        <div
          role="img"
          aria-label="Seat map"
          style={{
            position: "relative",
            width: viewport.width,
            height: viewport.height,
            background: parsedLayoutMeta.background || "#f8fafc",
            border: "1px solid #cbd5e1",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: stageConfig.y + viewport.offsetY,
              left: stageConfig.x + viewport.offsetX,
              width: stageConfig.width,
              height: stageConfig.height,
              textAlign: "center",
              background: stageConfig.background,
              color: stageConfig.color,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {stageConfig.label}
          </div>
          {normalizedSeats.map((seat) => {
            const selected = selectedSeatIds.includes(seat.id);
            const disabled = seat.status !== "open";
            const baseColor = getSeatColor(seat.section || "General", customSectionColors);
            const background = selected ? "#16a34a" : disabled ? (seat.status === "booked" ? "#94a3b8" : "#ef4444") : baseColor;
            const textColor = selected || !disabled ? "#ffffff" : seat.status === "booked" ? "#334155" : "#f1f5f9";

            return (
              <button
                key={seat.id}
                type="button"
                className={`absolute flex items-center justify-center rounded-full text-[10px] font-bold ${
                  disabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{
                  left: seat.cx + viewport.offsetX - seatRadius,
                  top: seat.cy + viewport.offsetY - seatRadius,
                  width: seatRadius * 2,
                  height: seatRadius * 2,
                  background,
                  color: textColor,
                  border: selected ? "2px solid #86efac" : "1px solid rgba(15, 23, 42, 0.25)",
                  opacity: disabled ? 0.85 : 1,
                }}
                disabled={disabled}
                onClick={() => onToggleSeat(seat.id)}
                title={`${seat.section} ${seat.row_label}-${seat.seat_number}`}
              >
                {seat.seat_number}
              </button>
            );
          })}
          {sectionLabels.map((section, idx) => (
            <span
              key={`section-${section.name}-${Math.round(section.minY)}-${idx}`}
              style={{
                position: "absolute",
                left: (section.minX + section.maxX) / 2 + viewport.offsetX,
                transform: "translateX(-50%)",
                top: section.minY + viewport.offsetY - sectionLabelVerticalOffset,
                fontSize: 12,
                lineHeight: 1,
                fontWeight: 700,
                color: "#1e293b",
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #cbd5e1",
                borderRadius: 999,
                padding: "4px 8px",
                zIndex: 2,
                whiteSpace: "nowrap",
              }}
            >
              {section.name}
            </span>
          ))}
          {rowLabels.map((row, idx) => {
            const isNumericRowLabel = /^\d+$/.test(row.label.trim());
            const rowText = isNumericRowLabel ? `${tr("row")} ${row.label}` : row.label;
            const rowSpanWidth = row.maxX - row.minX;
            const showRightLabel = rowSpanWidth > 56;

            return (
              <div key={`row-${row.label}-${Math.round(row.centerY)}-${Math.round(row.minX)}-${idx}`}>
                <span
                  style={{
                    position: "absolute",
                    left: row.minX + viewport.offsetX - seatRadius - leftRowLabelGap,
                    transform: "translateX(-100%)",
                    top: row.centerY + viewport.offsetY - rowLabelVerticalOffset,
                    fontSize: 12,
                    lineHeight: 1,
                    fontWeight: 700,
                    color: "#334155",
                    background: "rgba(248, 250, 252, 0.9)",
                    borderRadius: 6,
                    padding: "2px 4px",
                    zIndex: 2,
                  }}
                >
                  {rowText}
                </span>
                {showRightLabel ? (
                  <span
                    style={{
                      position: "absolute",
                      left: row.maxX + viewport.offsetX + seatRadius + 10,
                      top: row.centerY + viewport.offsetY - rowLabelVerticalOffset,
                      fontSize: 12,
                      lineHeight: 1,
                      fontWeight: 700,
                      color: "#334155",
                      background: "rgba(248, 250, 252, 0.9)",
                      borderRadius: 6,
                      padding: "2px 4px",
                      zIndex: 2,
                    }}
                  >
                    {rowText}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="card p-3 text-xs">
        <p className="mb-2 font-semibold">{tr("typeColors")}</p>
        <div className="flex flex-wrap gap-2">
          {sectionLegend.map((sectionName) => {
            const color = getSeatColor(sectionName, customSectionColors);
            return (
              <span key={sectionName} className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
                <span className="inline-block h-3 w-3 rounded" style={{ background: color }} />
                {sectionName}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
            <span className="inline-block h-3 w-3 rounded bg-slate-400" />
            {tr("bookedSeat")}
          </span>
          <span className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
            <span className="inline-block h-3 w-3 rounded bg-red-500" />
            {tr("paidSeat")}
          </span>
          <span className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
            <span className="inline-block h-3 w-3 rounded bg-green-600" />
            {tr("selectedSeat")}
          </span>
        </div>
      </div>
      <div className="card p-3 text-sm">
        <p>
          {tr("selectedSeats")}: <b>{selectedSeatIds.length}</b>
        </p>
        <p>
          {tr("total")}: <b>{selectedTotal.toFixed(2)} ₸</b>
        </p>
      </div>
      <div className="card p-3 text-sm">
        <p className="mb-2 font-semibold">{tr("takenPlaces")}</p>
        {takenSeats.length === 0 ? (
          <p className="muted">{tr("noTakenPlaces")}</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs">
            {takenSeats.map((seat) => (
              <span key={`taken-${seat.id}`} className="rounded border border-[var(--border)] px-2 py-1">
                {`${seat.section || "General"} ${seat.row_label}-${seat.seat_number}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
