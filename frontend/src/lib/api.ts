const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export type EventItem = {
  id: number;
  name: string;
  description: string;
  date: string;
  venue: number;
  venue_name: string;
  price_tiers: Record<string, number>;
  is_active: boolean;
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
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function getEvents(): Promise<EventItem[]> {
  const res = await apiFetch<{ results: EventItem[] }>("/events/");
  return res.results ?? [];
}

export async function getEvent(id: number): Promise<EventItem> {
  return apiFetch<EventItem>(`/events/${id}/`);
}

export async function getEventSeats(eventId: number): Promise<EventSeatsResponse> {
  return apiFetch<EventSeatsResponse>(`/events/${eventId}/seats/`);
}

export async function createBooking(input: BookingCreateInput) {
  return apiFetch<{ id: number }>(`/bookings/create/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getBooking(id: number) {
  return apiFetch<{
    id: number;
    customer_name: string;
    phone_number: string;
    status: string;
    total_price: string;
    event_name: string;
    event_date: string;
    venue_name: string;
    items: Array<{ seat_detail: { section: string; row_label: string; seat_number: number } }>;
    ticket?: { qr_data: string; is_scanned: boolean; scanned_at: string | null };
  }>(`/bookings/${id}/`);
}

export async function verifyQr(qrData: string) {
  return apiFetch<{ valid: boolean; error?: string; booking?: unknown; scanned_at?: string }>(
    "/tickets/verify/",
    {
      method: "POST",
      body: JSON.stringify({ qr_data: qrData }),
    },
  );
}
