"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEvent,
  getAdminEvents,
  getVenue,
  getVenues,
  toErrorMessage,
  updateEvent,
  type EventItem,
  type VenueListItem,
} from "@/lib/api";
import LocalDateTime from "@/components/local-date-time";
import { useAppSettings } from "@/components/app-settings-provider";

type TypePriceRow = {
  seatType: string;
  price: string;
};

type RowPriceRow = {
  section: string;
  rowLabel: string;
  seatType: string;
  seatsCount: number;
  price: string;
};

type VenueSeatPricingSource = {
  seat_type: string;
  section: string;
  row_label: string;
};

const ROW_PRICE_PREFIX = "row:";

function buildRowPriceKey(section: string, rowLabel: string): string {
  return `${ROW_PRICE_PREFIX}${section.trim()}::${rowLabel.trim()}`;
}

function parseRowPriceKey(key: string): { section: string; rowLabel: string } | null {
  if (!key.startsWith(ROW_PRICE_PREFIX)) return null;
  const raw = key.slice(ROW_PRICE_PREFIX.length);
  const [section, rowLabel] = raw.split("::");
  if (typeof rowLabel !== "string") return null;
  return {
    section: (section ?? "").trim(),
    rowLabel: rowLabel.trim(),
  };
}

function toDateTimeLocalValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toUtcIsoStringFromLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}

function getCurrentTimezoneLabel(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffsetMinutes / 60)).padStart(2, "0");
  const offsetRemainderMinutes = String(absOffsetMinutes % 60).padStart(2, "0");
  return `${timeZone} (UTC${sign}${offsetHours}:${offsetRemainderMinutes})`;
}

const emptyForm = {
  name: "",
  description: "",
  imageUrl: "",
  date: "",
  venue: "",
  typePrices: [] as TypePriceRow[],
  rowPrices: [] as RowPriceRow[],
  isActive: true,
};

function buildVenuePricingData(
  seats: Array<VenueSeatPricingSource>,
): {
  counts: Record<string, number>;
  sectionsByType: Record<string, string[]>;
  rows: Array<Pick<RowPriceRow, "section" | "rowLabel" | "seatType" | "seatsCount">>;
} {
  const counts: Record<string, number> = {};
  const sectionsByTypeSets: Record<string, Set<string>> = {};
  const rowMap = new Map<string, { section: string; rowLabel: string; seatType: string; seatsCount: number }>();
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

    const rowLabel = seat.row_label?.trim();
    if (rowLabel) {
      const rowKey = `${section || "_"}::${rowLabel}`;
      const existing = rowMap.get(rowKey);
      if (existing) {
        existing.seatsCount += 1;
      } else {
        rowMap.set(rowKey, {
          section: section || "",
          rowLabel,
          seatType,
          seatsCount: 1,
        });
      }
    }
  }
  const sectionsByType: Record<string, string[]> = {};
  for (const [seatType, sections] of Object.entries(sectionsByTypeSets)) {
    sectionsByType[seatType] = Array.from(sections).sort((a, b) => a.localeCompare(b));
  }
  const rows = Array.from(rowMap.values()).sort((a, b) => {
    const sectionCompare = a.section.localeCompare(b.section, undefined, { numeric: true });
    if (sectionCompare !== 0) return sectionCompare;
    return a.rowLabel.localeCompare(b.rowLabel, undefined, { numeric: true });
  });
  return { counts, sectionsByType, rows };
}

export default function AdminEventsManager() {
  const { tr } = useAppSettings();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [venueSeats, setVenueSeats] = useState<VenueSeatPricingSource[]>([]);
  const [venueTypeCounts, setVenueTypeCounts] = useState<Record<string, number>>({});
  const [venueTypeSections, setVenueTypeSections] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const venueSelectionRequestId = useRef(0);
  const currentTimezoneLabel = useMemo(() => getCurrentTimezoneLabel(), []);

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

  const rowPriceSummaries = useMemo(
    () =>
      form.rowPrices.map((row) => {
        const rawPrice = row.price.trim();
        const parsedPrice = rawPrice ? Number(rawPrice) : NaN;
        const unitPrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;
        return {
          sectionLabel: row.section ? `${row.section} · ${tr("row")} ${row.rowLabel}` : `${tr("row")} ${row.rowLabel}`,
          places: row.seatsCount,
          unitPrice,
          subtotal: unitPrice * row.seatsCount,
        };
      }),
    [form.rowPrices, tr],
  );

  const seatTypePriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of form.typePrices) {
      const seatType = row.seatType.trim();
      if (!seatType || !row.price.trim()) continue;
      const parsed = Number(row.price);
      if (!Number.isNaN(parsed)) map[seatType] = parsed;
    }
    return map;
  }, [form.typePrices]);

  const rowPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of form.rowPrices) {
      if (!row.price.trim()) continue;
      const parsed = Number(row.price);
      if (Number.isNaN(parsed)) continue;
      map[buildRowPriceKey(row.section, row.rowLabel)] = parsed;
    }
    return map;
  }, [form.rowPrices]);

  const totalSum = useMemo(
    () =>
      venueSeats.reduce((sum, seat) => {
        const rowPrice = rowPriceMap[buildRowPriceKey(seat.section || "", seat.row_label || "")];
        if (typeof rowPrice === "number") return sum + rowPrice;
        return sum + (seatTypePriceMap[seat.seat_type?.trim() || ""] ?? 0);
      }, 0),
    [rowPriceMap, seatTypePriceMap, venueSeats],
  );

  async function load() {
    const [eventsData, venuesData] = await Promise.all([getAdminEvents(), getVenues()]);
    setEvents(eventsData);
    setVenues(venuesData);
  }

  useEffect(() => {
    load().catch((e) => setError(toErrorMessage(e)));
  }, []);

  async function submit() {
    if (!form.name || !form.date || !form.venue) return;
    const validTypeRows = form.typePrices.filter((row) => row.seatType.trim() && row.price.trim());
    const validRowRows = form.rowPrices.filter((row) => row.rowLabel.trim() && row.price.trim());
    if (validTypeRows.length === 0 && validRowRows.length === 0) {
      setError(tr("typePriceRequired"));
      return;
    }

    const priceTiers: Record<string, number> = {};
    for (const row of validTypeRows) {
      const parsed = Number(row.price);
      if (Number.isNaN(parsed)) {
        setError(`${tr("price")} "${row.price}" is invalid.`);
        return;
      }
      priceTiers[row.seatType.trim()] = parsed;
    }
    for (const row of validRowRows) {
      const parsed = Number(row.price);
      if (Number.isNaN(parsed)) {
        setError(`${tr("price")} "${row.price}" is invalid.`);
        return;
      }
      priceTiers[buildRowPriceKey(row.section, row.rowLabel)] = parsed;
    }

    setLoading(true);
    setError("");
    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("description", form.description);
      payload.append("date", toUtcIsoStringFromLocalInput(form.date));
      payload.append("venue", String(Number(form.venue)));
      payload.append("price_tiers", JSON.stringify(priceTiers));
      payload.append("is_active", String(form.isActive));
      if (imageFile) {
        payload.append("image", imageFile);
      } else if (removeImage) {
        payload.append("image", "");
      }

      if (editingEventId === null) {
        await createEvent(payload);
      } else {
        await updateEvent(editingEventId, payload);
      }
      setForm(emptyForm);
      setImageFile(null);
      setRemoveImage(false);
      setEditingEventId(null);
      setVenueSeats([]);
      setVenueTypeCounts({});
      setVenueTypeSections({});
      await load();
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(event: EventItem) {
    try {
      await updateEvent(event.id, { is_active: !event.is_active });
      await load();
    } catch (e) {
      setError(toErrorMessage(e));
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
      setVenueSeats([]);
      setVenueTypeCounts({});
      setVenueTypeSections({});
      setForm((s) => ({ ...s, typePrices: [], rowPrices: [] }));
      return;
    }

    try {
      const venue = await getVenue(Number(venueId));
      if (requestId !== venueSelectionRequestId.current) return;

      const { counts, sectionsByType, rows } = buildVenuePricingData(venue.seats);
      const orderedTypes = Object.keys(counts).sort((a, b) => a.localeCompare(b));
      setVenueSeats(venue.seats);
      setVenueTypeCounts(counts);
      setVenueTypeSections(sectionsByType);
      setForm((s) => ({
        ...s,
        typePrices: orderedTypes.map((seatType) => ({ seatType, price: "" })),
        rowPrices: rows.map((row) => ({ ...row, price: "" })),
      }));
    } catch (e) {
      if (requestId !== venueSelectionRequestId.current) return;
      setVenueSeats([]);
      setVenueTypeCounts({});
      setVenueTypeSections({});
      setForm((s) => ({ ...s, typePrices: [], rowPrices: [] }));
      setError(toErrorMessage(e));
    }
  }

  function cancelEditing() {
    setEditingEventId(null);
    setForm(emptyForm);
    setImageFile(null);
    setRemoveImage(false);
    setVenueSeats([]);
    setVenueTypeCounts({});
    setVenueTypeSections({});
    setError("");
  }

  async function startEditing(event: EventItem) {
    const requestId = ++venueSelectionRequestId.current;
    setLoading(true);
    setError("");
    try {
      const venue = await getVenue(event.venue);
      if (requestId !== venueSelectionRequestId.current) return;
      const { counts, sectionsByType, rows } = buildVenuePricingData(venue.seats);
      const typePrices: TypePriceRow[] = [];
      const rowPrices: RowPriceRow[] = rows.map((row) => ({
        ...row,
        price: "",
      }));

      for (const [key, value] of Object.entries(event.price_tiers ?? {})) {
        const rowKey = parseRowPriceKey(key);
        if (rowKey) {
          const existingRow = rowPrices.find(
            (row) => row.section === rowKey.section && row.rowLabel === rowKey.rowLabel,
          );
          if (existingRow) {
            existingRow.price = String(value);
          } else {
            rowPrices.push({
              section: rowKey.section,
              rowLabel: rowKey.rowLabel,
              seatType: "",
              seatsCount: 0,
              price: String(value),
            });
          }
          continue;
        }
        typePrices.push({ seatType: key, price: String(value) });
      }

      const sortedTypePrices = typePrices.sort((a, b) => a.seatType.localeCompare(b.seatType));
      setVenueSeats(venue.seats);
      setVenueTypeCounts(counts);
      setVenueTypeSections(sectionsByType);
      setForm({
        name: event.name,
        description: event.description || "",
        imageUrl: event.image || "",
        date: toDateTimeLocalValue(event.date),
        venue: String(event.venue),
        typePrices: sortedTypePrices,
        rowPrices,
        isActive: event.is_active,
      });
      setImageFile(null);
      setRemoveImage(false);
      setEditingEventId(event.id);
    } catch (e) {
      if (requestId !== venueSelectionRequestId.current) return;
      setError(toErrorMessage(e));
    } finally {
      if (requestId === venueSelectionRequestId.current) {
        setLoading(false);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {editingEventId === null ? tr("createEvent") : tr("editEvent")}
          </h2>
          {editingEventId !== null ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
              {tr("editingEventBadge")}
            </span>
          ) : null}
        </div>
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
        <div className="space-y-2">
          <label className="text-sm font-medium">{tr("eventImage")}</label>
          <input
            type="file"
            accept="image/*"
            className="input-field"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setImageFile(file);
              if (file) setRemoveImage(false);
            }}
          />
          {form.imageUrl && !removeImage && !imageFile ? (
            <img src={form.imageUrl} alt={form.name || "Event image"} className="h-28 rounded-lg object-cover" />
          ) : null}
          {(form.imageUrl || imageFile) && (
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRemoveImage(checked);
                  if (checked) setImageFile(null);
                }}
              />
              {tr("removeImage")}
            </label>
          )}
        </div>
        <input
          type="datetime-local"
          className="input-field"
          value={form.date}
          onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
        />
        <p className="text-xs text-[var(--muted)]">{tr("currentTimezone", { timezone: currentTimezoneLabel })}</p>
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
          <p className="text-sm font-semibold">{tr("seatType")}</p>
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
          {form.rowPrices.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-semibold">{tr("rowPrices")}</p>
              {form.rowPrices.map((row) => (
                <div
                  key={`${row.section}-${row.rowLabel}`}
                  className="grid grid-cols-[1fr_180px_120px] gap-2"
                >
                  <div className="flex items-center rounded border border-[var(--border)] px-3 text-sm">
                    {row.section ? `${row.section} · ${tr("row")} ${row.rowLabel}` : `${tr("row")} ${row.rowLabel}`}
                  </div>
                  <input
                    className="input-field"
                    placeholder={tr("price")}
                    value={row.price}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        rowPrices: s.rowPrices.map((item) =>
                          item.section === row.section && item.rowLabel === row.rowLabel
                            ? { ...item, price: e.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <div className="flex items-center rounded border border-[var(--border)] px-3 text-sm text-[var(--muted)]">
                    {row.seatsCount} {tr("seatsCount")}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {form.typePrices.length > 0 || form.rowPrices.length > 0 ? (
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
                {rowPriceSummaries
                  .filter((row) => row.unitPrice > 0)
                  .map((row, index) => (
                    <p key={`${row.sectionLabel}-${index}`} className="muted">
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
        <div className="flex items-center justify-end gap-2">
          {editingEventId !== null ? (
            <button className="button button-secondary" onClick={cancelEditing} disabled={loading}>
              {tr("cancelEditing")}
            </button>
          ) : null}
          <button className="button button-primary" onClick={submit} disabled={loading}>
            {loading ? tr("saving") : editingEventId === null ? tr("createEventBtn") : tr("saveEventChanges")}
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{tr("existingEvents")}</h2>
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
            {events.length}
          </span>
        </div>
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elev)]/40 p-6 text-center">
            <p className="text-sm font-medium text-[var(--muted)]">{tr("existingEvents")}</p>
            <p className="mt-1 text-xs text-[var(--muted)]/80">{tr("createEvent")}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="group rounded-xl border border-[var(--border)] bg-[var(--bg-elev)]/50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-base font-semibold leading-tight">{event.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      event.is_active
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40"
                        : "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/40"
                    }`}
                  >
                    {event.is_active ? tr("active") : tr("inactive")}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-[var(--muted)]">
                  <p className="rounded-md bg-[var(--bg)]/60 px-2.5 py-1.5">{event.venue_name}</p>
                  <p className="rounded-md bg-[var(--bg)]/60 px-2.5 py-1.5">
                    {<LocalDateTime value={event.date} />}
                  </p>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="flex items-center gap-2">
                    <button className="button button-secondary" onClick={() => startEditing(event)} disabled={loading}>
                      {tr("edit")}
                    </button>
                    <button className="button button-secondary" onClick={() => toggleActive(event)}>
                      {event.is_active ? tr("markInactive") : tr("markActive")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
