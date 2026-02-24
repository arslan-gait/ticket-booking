"use client";

import { useEffect, useMemo, useState } from "react";
import VenueEditor from "@/components/venue-editor";
import { createVenue, getVenue, getVenues, updateVenue, type VenueListItem } from "@/lib/api";

type SeatDraft = {
  label: string;
  cx: number;
  cy: number;
  section: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
};

const defaultLayout = {
  width: 900,
  height: 500,
  background: "#0f172a",
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default function AdminVenuesManager() {
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [layoutMeta, setLayoutMeta] = useState(JSON.stringify(defaultLayout, null, 2));
  const [seatsJson, setSeatsJson] = useState("[]");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedSeats = useMemo(() => parseJson<SeatDraft[]>(seatsJson, []), [seatsJson]);

  async function reloadVenues() {
    const data = await getVenues();
    setVenues(data);
  }

  useEffect(() => {
    reloadVenues().catch((e) => setError(String(e)));
  }, []);

  async function loadVenue(id: string) {
    if (!id) return;
    const venue = await getVenue(Number(id));
    setName(venue.name);
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
        description,
        layout_meta: parseJson<Record<string, unknown>>(layoutMeta, defaultLayout),
        seats: parseJson<SeatDraft[]>(seatsJson, []),
      };
      if (!name.trim()) throw new Error("Venue name is required.");

      if (selectedVenueId) {
        await updateVenue(Number(selectedVenueId), payload);
      } else {
        const created = await createVenue(payload);
        setSelectedVenueId(String(created.id));
      }
      await reloadVenues();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setSelectedVenueId("");
    setName("");
    setDescription("");
    setLayoutMeta(JSON.stringify(defaultLayout, null, 2));
    setSeatsJson("[]");
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold">Venue editor</h2>
        <div className="flex gap-2">
          <select
            className="w-full rounded border border-slate-600 bg-slate-900 p-2"
            value={selectedVenueId}
            onChange={(e) => {
              setSelectedVenueId(e.target.value);
              loadVenue(e.target.value).catch((err) => setError(String(err)));
            }}
          >
            <option value="">Create new venue</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} ({venue.seat_count} seats)
              </option>
            ))}
          </select>
          <button className="button button-secondary" onClick={resetForm}>
            New
          </button>
        </div>

        <input
          className="w-full rounded border border-slate-600 bg-slate-900 p-2"
          placeholder="Venue name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="min-h-20 w-full rounded border border-slate-600 bg-slate-900 p-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-sm text-slate-300">Layout metadata JSON</p>
        <textarea
          className="min-h-28 w-full rounded border border-slate-600 bg-slate-900 p-2 font-mono text-xs"
          value={layoutMeta}
          onChange={(e) => setLayoutMeta(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-300">Seats JSON array</p>
          <button className="button button-secondary" onClick={generateGrid}>
            Generate 48-seat grid
          </button>
        </div>
        <textarea
          className="min-h-48 w-full rounded border border-slate-600 bg-slate-900 p-2 font-mono text-xs"
          value={seatsJson}
          onChange={(e) => setSeatsJson(e.target.value)}
        />
        <button className="button button-primary" onClick={saveVenue} disabled={saving}>
          {saving ? "Saving..." : selectedVenueId ? "Update venue" : "Create venue"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      <div className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">Seat map preview</h2>
        <VenueEditor
          seats={parsedSeats.map((seat, idx) => ({
            id: idx + 1,
            label: seat.label || `S${idx + 1}`,
            cx: Number(seat.cx) || 0,
            cy: Number(seat.cy) || 0,
          }))}
        />
      </div>
    </div>
  );
}
