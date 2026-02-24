"use client";

import { Stage, Layer, Circle, Text, Group } from "react-konva";
import { useMemo } from "react";

type SeatDraft = {
  id: number;
  x: number;
  y: number;
  label: string;
};

type Props = {
  seats: SeatDraft[];
};

export default function VenueEditor({ seats }: Props) {
  const width = 900;
  const height = 500;
  const seatNodes = useMemo(
    () =>
      seats.map((seat) => (
        <Group key={seat.id}>
          <Circle x={seat.x} y={seat.y} radius={12} fill="#2563eb" />
          <Text x={seat.x - 14} y={seat.y + 16} text={seat.label} fontSize={12} />
        </Group>
      )),
    [seats],
  );

  return (
    <div className="overflow-x-auto card p-2">
      <Stage width={width} height={height}>
        <Layer>{seatNodes}</Layer>
      </Stage>
    </div>
  );
}
