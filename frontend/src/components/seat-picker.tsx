"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SeatItem } from "@/lib/api";
import { useAppSettings } from "@/components/app-settings-provider";

type Props = {
  seats: SeatItem[];
  selectedSeatIds: number[];
  onToggleSeat: (seatId: number) => void;
  onClearSelection?: () => void;
  priceTiers: Record<string, number>;
  layoutMeta: Record<string, unknown>;
  adminView?: boolean;
};

const ROW_PRICE_PREFIX = "row:";
const PRICE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#22c55e", "#a16207", "#0f766e"];

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

function getPriceColor(price: number, priceColorMap: Map<number, string>): string {
  if (!Number.isFinite(price) || price <= 0) return "#000000";
  return priceColorMap.get(price) || "#000000";
}

function buildRowPriceKey(section: string, rowLabel: string): string {
  return `${ROW_PRICE_PREFIX}${section.trim()}::${rowLabel.trim()}`;
}

function getSeatPrice(
  seat: Pick<SeatItem, "section" | "row_label" | "seat_type">,
  priceTiers: Record<string, number>,
): number {
  const rowPrice = priceTiers[buildRowPriceKey(seat.section || "", seat.row_label || "")];
  if (typeof rowPrice === "number") return rowPrice;
  return priceTiers[seat.seat_type] ?? 0;
}

export default function SeatPicker({
  seats,
  selectedSeatIds,
  onToggleSeat,
  onClearSelection,
  priceTiers,
  layoutMeta,
  adminView = false,
}: Props) {
  const { tr } = useAppSettings();
  const bookedSeatColor = adminView ? "#ef4444" : "#94a3b8";
  const paidSeatColor = "#6b7280";
  const formatSeatLabel = (seat: Pick<SeatItem, "section" | "row_label" | "seat_number">): string => {
    const section = seat.section?.trim() || "General";
    const rowLabel = seat.row_label?.trim() || "-";
    return `${section} ${rowLabel} ${tr("row").toLowerCase()}, ${seat.seat_number} ${tr("seatPlace")}`;
  };
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const [availableMapWidth, setAvailableMapWidth] = useState(0);
  const uniquePrices = useMemo(() => {
    const values = new Set<number>();
    for (const seat of seats) {
      const price = getSeatPrice(seat, priceTiers);
      if (Number.isFinite(price) && price > 0) values.add(price);
    }
    return Array.from(values).sort((a, b) => a - b);
  }, [seats, priceTiers]);
  const priceColorMap = useMemo(() => {
    const map = new Map<number, string>();
    uniquePrices.forEach((price, index) => {
      map.set(price, PRICE_COLORS[index % PRICE_COLORS.length]);
    });
    return map;
  }, [uniquePrices]);
  const selectedTotal = useMemo(() => {
    return seats
      .filter((s) => selectedSeatIds.includes(s.id))
      .reduce((sum, s) => sum + getSeatPrice(s, priceTiers), 0);
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
  const selectedSeats = useMemo(
    () =>
      seats
        .filter((seat) => selectedSeatIds.includes(seat.id))
        .sort((a, b) => {
          const sectionCompare = (a.section || "").localeCompare(b.section || "", undefined, { numeric: true });
          if (sectionCompare !== 0) return sectionCompare;
          const rowCompare = (a.row_label || "").localeCompare(b.row_label || "", undefined, { numeric: true });
          if (rowCompare !== 0) return rowCompare;
          return a.seat_number - b.seat_number;
        }),
    [seats, selectedSeatIds],
  );
  const parsedLayoutMeta = (layoutMeta || {}) as LayoutMeta;

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

  useEffect(() => {
    const node = mapViewportRef.current;
    if (!node) return;

    const updateWidth = () => {
      setAvailableMapWidth(node.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const mapScale = useMemo(() => {
    if (availableMapWidth <= 0) return 1;
    return Math.min(1, availableMapWidth / viewport.width);
  }, [availableMapWidth, viewport.width]);

  return (
    <div className="space-y-4">
      <div className="card p-2">
        <div ref={mapViewportRef} className="w-full overflow-auto">
          <div
            style={{
              width: Math.ceil(viewport.width * mapScale),
              height: Math.ceil(viewport.height * mapScale),
            }}
          >
            <div
              role="img"
              aria-label="Seat map"
              style={{
                position: "relative",
                width: viewport.width,
                height: viewport.height,
                background: parsedLayoutMeta.background || "#f8fafc",
                border: "1px solid #cbd5e1",
                transform: `scale(${mapScale})`,
                transformOrigin: "top left",
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
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {stageConfig.label}
              </div>
              {normalizedSeats.map((seat) => {
                const selected = selectedSeatIds.includes(seat.id);
                const disabled = seat.status !== "open";
                const baseColor = getPriceColor(getSeatPrice(seat, priceTiers), priceColorMap);
                const currentSeatRadius = selected ? seatRadius + 2 : seatRadius;
                const background = disabled ? (seat.status === "booked" ? bookedSeatColor : paidSeatColor) : baseColor;
                const textColor = !disabled
                  ? "#ffffff"
                  : seat.status === "booked" && !adminView
                    ? "#334155"
                    : "#f9fafb";

                return (
                  <button
                    key={seat.id}
                    type="button"
                    className={`absolute flex items-center justify-center rounded-full text-[12px] font-bold ${
                      disabled ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                    style={{
                      left: seat.cx + viewport.offsetX - currentSeatRadius,
                      top: seat.cy + viewport.offsetY - currentSeatRadius,
                      width: currentSeatRadius * 2,
                      height: currentSeatRadius * 2,
                      background,
                      color: textColor,
                      border: selected ? "2px solid #111827" : "1px solid rgba(15, 23, 42, 0.25)",
                      fontSize: selected ? 13 : 12,
                      fontWeight: selected ? 800 : 700,
                      boxShadow: selected ? "0 0 0 2px rgba(15, 23, 42, 0.15)" : "none",
                      zIndex: selected ? 3 : 1,
                      opacity: disabled ? 0.85 : 1,
                    }}
                    disabled={disabled}
                    onClick={() => onToggleSeat(seat.id)}
                    title={formatSeatLabel(seat)}
                  >
                    {seat.seat_number}
                    {selected ? (
                      <span
                        style={{
                          position: "absolute",
                          top: -4,
                          right: -4,
                          width: 14,
                          height: 14,
                          borderRadius: "9999px",
                          background: "#111827",
                          color: "#ffffff",
                          fontSize: 11,
                          lineHeight: "14px",
                          fontWeight: 800,
                          textAlign: "center",
                          boxShadow: "0 0 0 1px #ffffff",
                        }}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    ) : null}
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
                    fontSize: 14,
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
                        fontSize: 14,
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
                          fontSize: 14,
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
        </div>
      </div>
      <div className="card p-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {uniquePrices.map((price) => {
            const color = getPriceColor(price, priceColorMap);
            return (
              <span key={`price-${price}`} className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
                <span className="inline-block h-3 w-3 rounded" style={{ background: color }} />
                {price} ₸
              </span>
            );
          })}
          <span className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
            <span className="inline-block h-3 w-3 rounded" style={{ background: bookedSeatColor }} />
            {tr("bookedSeat")}
          </span>
          {adminView ? (
            <span className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1">
              <span className="inline-block h-3 w-3 rounded" style={{ background: paidSeatColor }} />
              {tr("paidSeat")}
            </span>
          ) : null}
        </div>
      </div>
      <div className="card p-3 text-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p>
            {tr("selectedSeats")}: <b>{selectedSeatIds.length}</b>
          </p>
          {onClearSelection ? (
            <button
              type="button"
              className="button button-secondary !px-3 !py-1 text-sm"
              onClick={onClearSelection}
              disabled={selectedSeatIds.length === 0}
            >
              {tr("clearSelection")}
            </button>
          ) : null}
        </div>
        <p>
          {tr("total")}: <b>{selectedTotal.toFixed(2)} ₸</b>
        </p>
      </div>
      {adminView ? (
        <div className="card p-3 text-sm">
          <p className="mb-2 font-semibold">{tr("takenPlaces")}</p>
          {takenSeats.length === 0 ? (
            <p className="muted">{tr("noTakenPlaces")}</p>
          ) : (
            <div className="flex flex-wrap gap-2 text-sm">
              {takenSeats.map((seat) => (
                <span key={`taken-${seat.id}`} className="rounded border border-[var(--border)] px-2 py-1">
                  {formatSeatLabel(seat)}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <div className="card p-3 text-sm">
        <p className="mb-2 font-semibold">{tr("selectedSeat")}</p>
        {selectedSeats.length === 0 ? (
          <p className="muted">{tr("noSelectedSeats")}</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-sm">
            {selectedSeats.map((seat) => (
              <span key={`selected-${seat.id}`} className="rounded border border-[var(--border)] px-2 py-1">
                {formatSeatLabel(seat)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
