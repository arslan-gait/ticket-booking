"use client";

import { useEffect, useMemo, useState } from "react";
import VenueEditor from "@/components/venue-editor";
import { createVenue, getVenue, getVenues, toErrorMessage, updateVenue, type VenueListItem } from "@/lib/api";
import { useAppSettings } from "@/components/app-settings-provider";

type SeatDraft = {
  label: string;
  cx: number;
  cy: number;
  section: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
};

type LayoutMetaDraft = {
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

const defaultLayout = {
  width: 900,
  height: 500,
  background: "#f8fafc",
  type_colors: {
    regular: "#000000",
    vip: "#000000",
    balcony: "#000000",
    box: "#000000",
    box_upper: "#000000",
  },
  stage: {
    x: 120,
    y: 20,
    width: 660,
    height: 64,
    label: "СЦЕНА",
    background: "#1e293b",
    color: "#f8fafc",
  },
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default function AdminVenuesManager() {
  const { tr } = useAppSettings();
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [name, setName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [description, setDescription] = useState("");
  const [layoutMeta, setLayoutMeta] = useState(JSON.stringify(defaultLayout, null, 2));
  const [seatsJson, setSeatsJson] = useState("[]");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedSeats = useMemo(() => parseJson<SeatDraft[]>(seatsJson, []), [seatsJson]);
  const parsedLayoutMeta = useMemo(() => parseJson<LayoutMetaDraft>(layoutMeta, defaultLayout), [layoutMeta]);
  const hasSeatsJson = seatsJson.trim().length > 0 && seatsJson.trim() !== "[]";

  async function reloadVenues() {
    const data = await getVenues();
    setVenues(data);
  }

  useEffect(() => {
    reloadVenues().catch((e) => setError(toErrorMessage(e)));
  }, []);

  async function loadVenue(id: string) {
    if (!id) return;
    const venue = await getVenue(Number(id));
    setName(venue.name);
    setAddressLine(venue.address_line || "");
    setDescription(venue.description || "");
    setLayoutMeta(JSON.stringify(venue.layout_meta ?? defaultLayout, null, 2));
    setSeatsJson(
      JSON.stringify(
        venue.seats.map((s) => ({
          label: s.label,
          cx: s.cx,
          cy: s.cy,
          section: s.section,
          row_label: s.row_label,
          seat_number: s.seat_number,
          seat_type: s.seat_type,
        })),
        null,
        2,
      ),
    );
  }

  function generateGrid() {
    const generated: SeatDraft[] = [];
    let index = 1;
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        generated.push({
          label: `A-${index}`,
          cx: 90 + col * 90,
          cy: 80 + row * 60,
          section: "Main",
          row_label: String.fromCharCode(65 + row),
          seat_number: col + 1,
          seat_type: row < 2 ? "vip" : "regular",
        });
        index += 1;
      }
    }
    setSeatsJson(JSON.stringify(generated, null, 2));
  }

  async function saveVenue() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name,
        address_line: addressLine,
        description,
        layout_meta: parseJson<Record<string, unknown>>(layoutMeta, defaultLayout),
        seats: parseJson<SeatDraft[]>(seatsJson, []),
      };
      if (!name.trim()) throw new Error(tr("venueNameRequired"));

      if (selectedVenueId) {
        await updateVenue(Number(selectedVenueId), payload);
      } else {
        const created = await createVenue(payload);
        setSelectedVenueId(String(created.id));
      }
      await reloadVenues();
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setSelectedVenueId("");
    setName("");
    setAddressLine("");
    setDescription("");
    setLayoutMeta(JSON.stringify(defaultLayout, null, 2));
    setSeatsJson("[]");
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold">{tr("venueEditor")}</h2>
        <div className="flex gap-2">
          <select
            className="input-field"
            value={selectedVenueId}
            onChange={(e) => {
              setSelectedVenueId(e.target.value);
              loadVenue(e.target.value).catch((err) => setError(toErrorMessage(err)));
            }}
          >
            <option value="">{tr("createNewVenue")}</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} ({venue.seat_count} {tr("seatsCount")})
              </option>
            ))}
          </select>
          <button className="button button-secondary" onClick={resetForm}>
            {tr("new")}
          </button>
        </div>

        <input
          className="input-field"
          placeholder={tr("venueName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input-field"
          placeholder={tr("venueAddressLine")}
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
        <textarea
          className="input-field min-h-20"
          placeholder={tr("description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="muted text-sm">{tr("layoutMeta")}</p>
        <textarea
          className="input-field min-h-28 font-mono text-xs"
          value={layoutMeta}
          onChange={(e) => setLayoutMeta(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <p className="muted text-sm">{tr("seatsJson")}</p>
          {!hasSeatsJson ? (
            <button className="button button-secondary" onClick={generateGrid}>
              {tr("generateGrid")}
            </button>
          ) : null}
        </div>
        <textarea
          className="input-field min-h-48 font-mono text-xs"
          value={seatsJson}
          onChange={(e) => setSeatsJson(e.target.value)}
        />
        <button className="button button-primary" onClick={saveVenue} disabled={saving}>
          {saving ? tr("saving") : selectedVenueId ? tr("updateVenue") : tr("createVenueBtn")}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      <div className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">{tr("seatPreview")}</h2>
        <VenueEditor
          layoutMeta={parsedLayoutMeta}
          rowPrefix={tr("row")}
          seats={parsedSeats.map((seat, idx) => ({
            id: idx + 1,
            label: seat.label || `S${idx + 1}`,
            cx: Number(seat.cx) || 0,
            cy: Number(seat.cy) || 0,
            rowLabel: seat.row_label || "",
            seatNumber: Number.isFinite(Number(seat.seat_number)) ? String(seat.seat_number) : "",
            section: seat.section || "",
            seatType: seat.seat_type || "regular",
          }))}
        />
      </div>
    </div>
  );
}
