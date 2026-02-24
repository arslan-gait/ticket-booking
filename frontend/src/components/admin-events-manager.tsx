"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEvent,
  getAdminEvents,
  getVenue,
  getVenues,
  updateEvent,
  type EventItem,
  type VenueListItem,
} from "@/lib/api";
import { useAppSettings } from "@/components/app-settings-provider";

type TypePriceRow = {
  seatType: string;
  price: string;
};

const emptyForm = {
  name: "",
  description: "",
  date: "",
  venue: "",
  typePrices: [] as TypePriceRow[],
  isActive: true,
};

function buildSeatTypeCounts(
  seats: Array<{ seat_type: string; section: string }>,
): {
  counts: Record<string, number>;
  sectionsByType: Record<string, string[]>;
} {
  const counts: Record<string, number> = {};
  const sectionsByTypeSets: Record<string, Set<string>> = {};
  for (const seat of seats) {
    const seatType = seat.seat_type?.trim();
    if (!seatType) continue;
    counts[seatType] = (counts[seatType] || 0) + 1;

    const section = seat.section?.trim();
    if (!sectionsByTypeSets[seatType]) {
      sectionsByTypeSets[seatType] = new Set<string>();
    }
    if (section) {
      sectionsByTypeSets[seatType].add(section);
    }
  }
  const sectionsByType: Record<string, string[]> = {};
  for (const [seatType, sections] of Object.entries(sectionsByTypeSets)) {
    sectionsByType[seatType] = Array.from(sections).sort((a, b) => a.localeCompare(b));
  }
  return { counts, sectionsByType };
}

export default function AdminEventsManager() {
  const { tr } = useAppSettings();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [venueTypeCounts, setVenueTypeCounts] = useState<Record<string, number>>({});
  const [venueTypeSections, setVenueTypeSections] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const venueSelectionRequestId = useRef(0);

  const totalPlaces = useMemo(
    () => Object.values(venueTypeCounts).reduce((sum, count) => sum + count, 0),
    [venueTypeCounts],
  );

  const rowSummaries = useMemo(
    () =>
      form.typePrices.map((row) => {
        const places = venueTypeCounts[row.seatType.trim()] || 0;
        const rawPrice = row.price.trim();
        const parsedPrice = rawPrice ? Number(rawPrice) : NaN;
        const unitPrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;
        return {
          seatType: row.seatType.trim(),
          sectionLabel:
            (venueTypeSections[row.seatType.trim()] || []).join(", ") || row.seatType.trim() || "(empty type)",
          places,
          unitPrice,
          subtotal: unitPrice * places,
        };
      }),
    [form.typePrices, venueTypeCounts, venueTypeSections],
  );

  const totalSum = useMemo(
    () => rowSummaries.reduce((sum, row) => sum + row.subtotal, 0),
    [rowSummaries],
  );

  async function load() {
    const [eventsData, venuesData] = await Promise.all([getAdminEvents(), getVenues()]);
    setEvents(eventsData);
    setVenues(venuesData);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, []);

  async function submit() {
    if (!form.name || !form.date || !form.venue) return;
    const validRows = form.typePrices.filter((row) => row.seatType.trim() && row.price.trim());
    if (validRows.length === 0) {
      setError(tr("typePriceRequired"));
      return;
    }

    const priceTiers: Record<string, number> = {};
    for (const row of validRows) {
      const parsed = Number(row.price);
      if (Number.isNaN(parsed)) {
        setError(`${tr("price")} "${row.price}" is invalid.`);
        return;
      }
      priceTiers[row.seatType.trim()] = parsed;
    }

    setLoading(true);
    setError("");
    try {
      await createEvent({
        name: form.name,
        description: form.description,
        date: form.date,
        venue: Number(form.venue),
        price_tiers: priceTiers,
        is_active: form.isActive,
      });
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(event: EventItem) {
    try {
      await updateEvent(event.id, { is_active: !event.is_active });
      await load();
    } catch (e) {
      setError(String(e));
    }
  }

  function addTypePriceRow() {
    setForm((s) => ({
      ...s,
      typePrices: [...s.typePrices, { seatType: "", price: "" }],
    }));
  }

  function updateTypePriceRow(index: number, key: keyof TypePriceRow, value: string) {
    setForm((s) => ({
      ...s,
      typePrices: s.typePrices.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    }));
  }

  function removeTypePriceRow(index: number) {
    setForm((s) => ({
      ...s,
      typePrices: s.typePrices.filter((_, rowIndex) => rowIndex !== index),
    }));
  }

  async function onVenueChange(venueId: string) {
    const requestId = ++venueSelectionRequestId.current;
    setForm((s) => ({ ...s, venue: venueId }));
    setError("");

    if (!venueId) {
      setVenueTypeCounts({});
      setVenueTypeSections({});
      setForm((s) => ({ ...s, typePrices: [] }));
      return;
    }

    try {
      const venue = await getVenue(Number(venueId));
      if (requestId !== venueSelectionRequestId.current) return;

      const { counts, sectionsByType } = buildSeatTypeCounts(venue.seats);
      const orderedTypes = Object.keys(counts).sort((a, b) => a.localeCompare(b));
      setVenueTypeCounts(counts);
      setVenueTypeSections(sectionsByType);
      setForm((s) => ({
        ...s,
        typePrices: orderedTypes.map((seatType) => ({ seatType, price: "" })),
      }));
    } catch (e) {
      if (requestId !== venueSelectionRequestId.current) return;
      setVenueTypeCounts({});
      setVenueTypeSections({});
      setForm((s) => ({ ...s, typePrices: [] }));
      setError(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold">{tr("createEvent")}</h2>
        <input
          className="input-field"
          placeholder={tr("eventName")}
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
        />
        <input
          className="input-field"
          placeholder={tr("description")}
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
        />
        <input
          type="datetime-local"
          className="input-field"
          value={form.date}
          onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
        />
        <select
          className="input-field"
          value={form.venue}
          onChange={(e) => onVenueChange(e.target.value)}
        >
          <option value="">{tr("selectVenue")}</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
        <div className="space-y-2">
          {form.typePrices.map((row, index) => (
            <div key={`${index}-${row.seatType}`} className="grid grid-cols-[1fr_180px_120px_120px] gap-2">
              <div className="flex items-center rounded border border-[var(--border)] px-3 text-sm">
                {(venueTypeSections[row.seatType.trim()] || []).join(", ") || row.seatType}
              </div>
              <input
                className="input-field"
                placeholder={tr("price")}
                value={row.price}
                onChange={(e) => updateTypePriceRow(index, "price", e.target.value)}
              />
              <div className="flex items-center rounded border border-[var(--border)] px-3 text-sm text-[var(--muted)]">
                {venueTypeCounts[row.seatType.trim()] || 0} {tr("seatsCount")}
              </div>
              <button className="button button-secondary" type="button" onClick={() => removeTypePriceRow(index)}>
                {tr("remove")}
              </button>
            </div>
          ))}
          <button className="button button-secondary" type="button" onClick={addTypePriceRow}>
            {tr("addTypePrice")}
          </button>
          {form.typePrices.length > 0 ? (
            <div className="mt-2 rounded border border-[var(--border)] p-3 text-sm">
              <p className="mb-2 font-medium">
                Total places: {totalPlaces} {tr("seatsCount")}
              </p>
              <div className="space-y-1">
                {rowSummaries.map((row, index) => (
                  <p key={`${row.seatType || "type"}-${index}`} className="muted">
                    {row.sectionLabel + ": "}
                    {row.unitPrice} ₸ × {row.places} = {row.subtotal} ₸
                  </p>
                ))}
              </div>
              <p className="mt-2 font-semibold">
                {tr("total")}: {totalSum} ₸
              </p>
            </div>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
          />
          {tr("activeEvent")}
        </label>
        <button className="button button-primary" onClick={submit} disabled={loading}>
          {loading ? tr("saving") : tr("createEventBtn")}
        </button>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-lg font-semibold">{tr("existingEvents")}</h2>
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded border border-[var(--border)] p-3">
              <div>
                <p className="font-medium">{event.name}</p>
                <p className="muted text-sm">
                  {event.venue_name} · {new Date(event.date).toLocaleString()}
                </p>
                <p className="muted text-xs">
                  {tr("status")}: {event.is_active ? tr("active") : tr("inactive")}
                </p>
              </div>
              <button className="button button-secondary" onClick={() => toggleActive(event)}>
                {event.is_active ? tr("markInactive") : tr("markActive")}
              </button>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
