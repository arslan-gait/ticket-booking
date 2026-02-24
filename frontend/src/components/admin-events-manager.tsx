"use client";

import { useEffect, useState } from "react";
import { createEvent, getAdminEvents, getVenues, updateEvent, type EventItem, type VenueListItem } from "@/lib/api";
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
  typePrices: [
    { seatType: "vip", price: "50" },
    { seatType: "regular", price: "25" },
    { seatType: "balcony", price: "15" },
  ] as TypePriceRow[],
  isActive: true,
};

export default function AdminEventsManager() {
  const { tr } = useAppSettings();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          onChange={(e) => setForm((s) => ({ ...s, venue: e.target.value }))}
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
            <div key={`${index}-${row.seatType}`} className="grid grid-cols-[1fr_160px_120px] gap-2">
              <input
                className="input-field"
                placeholder={tr("seatType")}
                value={row.seatType}
                onChange={(e) => updateTypePriceRow(index, "seatType", e.target.value)}
              />
              <input
                className="input-field"
                placeholder={tr("price")}
                value={row.price}
                onChange={(e) => updateTypePriceRow(index, "price", e.target.value)}
              />
              <button className="button button-secondary" type="button" onClick={() => removeTypePriceRow(index)}>
                {tr("remove")}
              </button>
            </div>
          ))}
          <button className="button button-secondary" type="button" onClick={addTypePriceRow}>
            {tr("addTypePrice")}
          </button>
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
