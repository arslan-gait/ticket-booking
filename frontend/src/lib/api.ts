const SERVER_API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:8008/api";
const CLIENT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const API_BASE = typeof window === "undefined" ? SERVER_API_BASE : CLIENT_API_BASE;

type JsonObject = Record<string, unknown>;

function getApiLanguageHeader(): string {
  if (typeof window === "undefined") return "ru";
  const lang = document.documentElement.lang.toLowerCase();
  return lang.startsWith("en") ? "en" : "ru";
}

function getFirstErrorValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = getFirstErrorValue(item);
      if (nested) return nested;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value as JsonObject)) {
      const nested = getFirstErrorValue(nestedValue);
      if (nested) return nested;
    }
  }
  return null;
}

function parseApiErrorMessage(rawText: string, response: Response): string {
  const fallback = `Request failed (${response.status})`;
  if (!rawText) return fallback;

  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (!parsed || typeof parsed !== "object") return rawText;
    const data = parsed as JsonObject;

    if (typeof data.error === "string") return data.error;
    if (typeof data.detail === "string") return data.detail;

    const firstFieldError = getFirstErrorValue(data);
    return firstFieldError ?? fallback;
  } catch {
    return rawText;
  }
}

export type EventItem = {
  id: number;
  name: string;
  description: string;
  image: string | null;
  date: string;
  venue: number;
  venue_name: string;
  price_tiers: Record<string, number>;
  is_active: boolean;
};

type Paginated<T> = { results: T[] };

export type VenueListItem = {
  id: number;
  name: string;
  description: string;
  seat_count: number;
};

export type VenueDetail = {
  id: number;
  name: string;
  description: string;
  layout_meta: Record<string, unknown>;
  seats: Array<{
    id: number;
    label: string;
    cx: number;
    cy: number;
    section: string;
    row_label: string;
    seat_number: number;
    seat_type: string;
  }>;
};

export type BookingListItem = {
  id: number;
  public_token: string;
  event: number;
  event_name: string;
  event_date: string;
  customer_name: string;
  phone_number: string;
  status: string;
  total_price: string;
  seat_count: number;
  created_at: string;
};

export type SeatItem = {
  id: number;
  label: string;
  cx: number;
  cy: number;
  section: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
  status: "open" | "booked" | "paid";
};

export type EventSeatsResponse = {
  event_id: number;
  venue: {
    id: number;
    name: string;
    layout_meta: Record<string, unknown>;
  };
  price_tiers: Record<string, number>;
  seats: SeatItem[];
};

export type BookingCreateInput = {
  event_id: number;
  customer_name: string;
  phone_number: string;
  seat_ids: number[];
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormDataBody = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Accept-Language": getApiLanguageHeader(),
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiErrorMessage(text, response));
  }
  return (await response.json()) as T;
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function getEvents(): Promise<EventItem[]> {
  const res = await apiFetch<Paginated<EventItem>>("/events/");
  return res.results ?? [];
}

export async function getEvent(id: number): Promise<EventItem> {
  return apiFetch<EventItem>(`/events/${id}/`);
}

export async function getEventSeats(eventId: number): Promise<EventSeatsResponse> {
  return apiFetch<EventSeatsResponse>(`/events/${eventId}/seats/`);
}

export async function createBooking(input: BookingCreateInput) {
  return apiFetch<{ id: number; public_token: string }>(`/bookings/create/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getAdminEvents(): Promise<EventItem[]> {
  const res = await apiFetch<Paginated<EventItem>>("/events/?include_inactive=1");
  return res.results ?? [];
}

export async function createEvent(input: {
  name: string;
  description: string;
  date: string;
  venue: number;
  price_tiers: Record<string, number>;
  is_active: boolean;
} | FormData) {
  const body = input instanceof FormData ? input : JSON.stringify(input);
  return apiFetch<EventItem>("/events/", {
    method: "POST",
    body,
  });
}

export async function updateEvent(
  id: number,
  input: Partial<{
    name: string;
    description: string;
    date: string;
    venue: number;
    price_tiers: Record<string, number>;
    is_active: boolean;
  }> | FormData,
) {
  const body = input instanceof FormData ? input : JSON.stringify(input);
  return apiFetch<EventItem>(`/events/${id}/`, {
    method: "PATCH",
    body,
  });
}

export async function getVenues(): Promise<VenueListItem[]> {
  const res = await apiFetch<Paginated<VenueListItem>>("/venues/");
  return res.results ?? [];
}

export async function getVenue(id: number): Promise<VenueDetail> {
  return apiFetch<VenueDetail>(`/venues/${id}/`);
}

export async function createVenue(input: {
  name: string;
  description: string;
  layout_meta: Record<string, unknown>;
  seats: Array<{
    label: string;
    cx: number;
    cy: number;
    section: string;
    row_label: string;
    seat_number: number;
    seat_type: string;
  }>;
}) {
  return apiFetch<VenueDetail>("/venues/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateVenue(
  id: number,
  input: Partial<{
    name: string;
    description: string;
    layout_meta: Record<string, unknown>;
    seats: Array<{
      label: string;
      cx: number;
      cy: number;
      section: string;
      row_label: string;
      seat_number: number;
      seat_type: string;
    }>;
  }>,
) {
  return apiFetch<VenueDetail>(`/venues/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getBookings(params?: { event?: number; status?: string }) {
  const search = new URLSearchParams();
  if (params?.event) search.set("event", String(params.event));
  if (params?.status) search.set("status", params.status);
  const query = search.toString();
  const res = await apiFetch<Paginated<BookingListItem>>(`/bookings/${query ? `?${query}` : ""}`);
  return res.results ?? [];
}

export async function updateBookingStatus(id: number, status: "paid" | "cancelled") {
  return apiFetch(`/bookings/${id}/update-status/`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function getBooking(token: string) {
  return apiFetch<{
    id: number;
    public_token: string;
    customer_name: string;
    phone_number: string;
    status: string;
    total_price: string;
    event_name: string;
    event_date: string;
    venue_name: string;
    items: Array<{ seat_detail: { section: string; row_label: string; seat_number: number } }>;
    ticket?: { qr_data: string; is_scanned: boolean; scanned_at: string | null };
  }>(`/bookings/public/${token}/`);
}

type VerifiedSeat = {
  section: string;
  row: string;
  number: number;
  type: string;
};

type VerifiedBooking = {
  id: number;
  customer_name: string;
  phone_number: string;
  event: string;
  event_date: string;
  venue: string;
  seats: VerifiedSeat[];
  total_price: string;
};

export async function verifyQr(qrData: string, options?: { consume?: boolean }) {
  return apiFetch<{
    valid: boolean;
    consumed?: boolean;
    error?: string;
    booking?: VerifiedBooking;
    scanned_at?: string | null;
  }>(
    "/tickets/verify/",
    {
      method: "POST",
      body: JSON.stringify({ qr_data: qrData, consume: options?.consume ?? true }),
    },
  );
}
