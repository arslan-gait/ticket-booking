"use client";

import { useEffect, useState } from "react";
import { createEvent, getAdminEvents, getVenues, updateEvent, type EventItem, type VenueListItem } from "@/lib/api";

const emptyForm = {
  name: "",
  description: "",
  date: "",
  venue: "",
  vipPrice: "50",
  regularPrice: "25",
  balconyPrice: "15",
  isActive: true,
};

export default function AdminEventsManager() {
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
    setLoading(true);
    setError("");
    try {
      await createEvent({
        name: form.name,
        description: form.description,
        date: form.date,
        venue: Number(form.venue),
        price_tiers: {
          vip: Number(form.vipPrice),
          regular: Number(form.regularPrice),
          balcony: Number(form.balconyPrice),
        },
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

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold">Create event</h2>
        <input
          className="w-full rounded border border-slate-600 bg-slate-900 p-2"
          placeholder="Event name"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
        />
        <input
          className="w-full rounded border border-slate-600 bg-slate-900 p-2"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
        />
        <input
          type="datetime-local"
          className="w-full rounded border border-slate-600 bg-slate-900 p-2"
          value={form.date}
          onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
        />
        <select
          className="w-full rounded border border-slate-600 bg-slate-900 p-2"
          value={form.venue}
          onChange={(e) => setForm((s) => ({ ...s, venue: e.target.value }))}
        >
          <option value="">Select venue</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2"
            placeholder="VIP"
            value={form.vipPrice}
            onChange={(e) => setForm((s) => ({ ...s, vipPrice: e.target.value }))}
          />
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2"
            placeholder="Regular"
            value={form.regularPrice}
            onChange={(e) => setForm((s) => ({ ...s, regularPrice: e.target.value }))}
          />
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2"
            placeholder="Balcony"
            value={form.balconyPrice}
            onChange={(e) => setForm((s) => ({ ...s, balconyPrice: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
          />
          Active event
        </label>
        <button className="button button-primary" onClick={submit} disabled={loading}>
          {loading ? "Saving..." : "Create event"}
        </button>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-lg font-semibold">Existing events</h2>
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded border border-slate-700 p-3">
              <div>
                <p className="font-medium">{event.name}</p>
                <p className="text-sm text-slate-300">
                  {event.venue_name} · {new Date(event.date).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Status: {event.is_active ? "active" : "inactive"}</p>
              </div>
              <button className="button button-secondary" onClick={() => toggleActive(event)}>
                Mark {event.is_active ? "inactive" : "active"}
              </button>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
