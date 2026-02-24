"use client";

import { useMemo } from "react";

type SeatDraft = {
  id: number;
  cx: number;
  cy: number;
  label: string;
  rowLabel?: string;
  seatNumber?: string;
  section?: string;
  seatType?: string;
};

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

type Props = {
  seats: SeatDraft[];
  layoutMeta?: LayoutMeta;
  rowPrefix?: string;
};

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const DEFAULT_SEAT_TYPE_COLORS: Record<string, string> = {
  regular: "#000000",
  vip: "#000000",
  balcony: "#000000",
  box: "#000000",
  box_upper: "#000000",
};

export default function VenueEditor({ seats, layoutMeta, rowPrefix }: Props) {
  const defaultWidth = 900;
  const defaultHeight = 500;
  const padding = 32;
  const seatRadius = 12;
  const leftRowLabelGap = 7;
  const rowLabelVerticalOffset = 6;
  const rowLabelLeftViewportReserve = 140;
  const rowLabelRightViewportReserve = 90;
  const sectionLabelTopReserve = 48;
  const sectionLabelVerticalOffset = 38;
  const seatTypeColors = useMemo(
    () => ({
      ...DEFAULT_SEAT_TYPE_COLORS,
      ...(layoutMeta?.type_colors || {}),
    }),
    [layoutMeta?.type_colors],
  );

  const stageConfig = useMemo(() => {
    const stage = layoutMeta?.stage;
    return {
      x: toFiniteNumber(stage?.x, 120),
      y: toFiniteNumber(stage?.y, 20),
      width: Math.max(120, toFiniteNumber(stage?.width, 660)),
      height: Math.max(36, toFiniteNumber(stage?.height, 64)),
      label: stage?.label?.trim() ? stage.label : "СЦЕНА",
      background: stage?.background || "#1e293b",
      color: stage?.color || "#f8fafc",
    };
  }, [layoutMeta]);

  const normalizedSeats = useMemo(
    () =>
      seats.filter(
        (seat) =>
          Number.isFinite(seat.cx) &&
          Number.isFinite(seat.cy) &&
          typeof seat.label === "string" &&
          seat.label.length > 0,
      ),
    [seats],
  );

  const viewport = useMemo(() => {
    const seatMinX = normalizedSeats.length ? Math.min(...normalizedSeats.map((seat) => seat.cx - seatRadius)) : stageConfig.x;
    const seatMaxX = normalizedSeats.length
      ? Math.max(...normalizedSeats.map((seat) => seat.cx + seatRadius))
      : stageConfig.x + stageConfig.width;
    // +28 leaves room for labels rendered under circles.
    const seatMinY = normalizedSeats.length ? Math.min(...normalizedSeats.map((seat) => seat.cy - seatRadius)) : stageConfig.y;
    const seatMaxY = normalizedSeats.length
      ? Math.max(...normalizedSeats.map((seat) => seat.cy + seatRadius + 28))
      : stageConfig.y + stageConfig.height;

    // Reserve extra horizontal space so row labels don't get clipped at viewport edges.
    const minX = Math.min(seatMinX - rowLabelLeftViewportReserve, stageConfig.x);
    const maxX = Math.max(seatMaxX + rowLabelRightViewportReserve, stageConfig.x + stageConfig.width);
    const minY = Math.min(seatMinY - sectionLabelTopReserve, stageConfig.y);
    const maxY = Math.max(seatMaxY, stageConfig.y + stageConfig.height);

    const preferredWidth = Math.max(defaultWidth, toFiniteNumber(layoutMeta?.width, defaultWidth));
    const preferredHeight = Math.max(defaultHeight, toFiniteNumber(layoutMeta?.height, defaultHeight));

    return {
      stageWidth: Math.max(preferredWidth, Math.ceil(maxX - minX + padding * 2)),
      stageHeight: Math.max(preferredHeight, Math.ceil(maxY - minY + padding * 2)),
      offsetX: padding - minX + seatRadius,
      offsetY: padding - minY + seatRadius,
    };
  }, [
    defaultHeight,
    defaultWidth,
    layoutMeta?.height,
    layoutMeta?.width,
    normalizedSeats,
    rowLabelLeftViewportReserve,
    rowLabelRightViewportReserve,
    sectionLabelTopReserve,
    seatRadius,
    stageConfig,
  ]);

  const seatNodes = useMemo(
    () =>
      normalizedSeats.map((seat) => (
        <div
          key={seat.id}
          style={{
            position: "absolute",
            pointerEvents: "none",
            left: seat.cx + viewport.offsetX - seatRadius,
            top: seat.cy + viewport.offsetY - seatRadius,
            width: seatRadius * 2,
            height: seatRadius * 2,
          }}
        >
          <div
            style={{
              // Color by seat type (vip/regular/balcony/...)
              background: seatTypeColors[(seat.seatType || "regular").toLowerCase()] || "#000000",
              width: "100%",
              height: "100%",
              borderRadius: "9999px",
              border: "1px solid rgba(15, 23, 42, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {seat.seatNumber || (seat.label.includes("-") ? seat.label.split("-").slice(-1)[0] : seat.label)}
          </div>
        </div>
      )),
    [normalizedSeats, seatRadius, seatTypeColors, viewport.offsetX, viewport.offsetY],
  );

  const rowLabels = useMemo(() => {
    const rowMergeTolerance = 28;
    const groupedSeats = new Map<string, SeatDraft[]>();

    for (const seat of normalizedSeats) {
      const rowKey = seat.rowLabel?.trim();
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
    <div className="overflow-auto card p-2">
      <div
        role="img"
        aria-label="Seat map preview"
        style={{
          position: "relative",
          width: viewport.stageWidth,
          height: viewport.stageHeight,
          background: layoutMeta?.background || "#f8fafc",
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
        {seatNodes}
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
          const rowText = rowPrefix && isNumericRowLabel ? `${rowPrefix} ${row.label}` : row.label;
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
  );
}
