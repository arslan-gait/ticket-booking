import Link from "next/link";
import { getBooking } from "@/lib/api";

type Params = { id: string };

export default async function BookingPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const booking = await getBooking(Number(id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Booking #{booking.id}</h1>
      <div className="card space-y-2 p-4">
        <p>
          Name: <b>{booking.customer_name}</b>
        </p>
        <p>
          WhatsApp: <b>{booking.phone_number}</b>
        </p>
        <p>
          Event: <b>{booking.event_name}</b>
        </p>
        <p>
          Venue: <b>{booking.venue_name}</b>
        </p>
        <p>
          Status: <b>{booking.status}</b>
        </p>
        <p>
          Total: <b>${booking.total_price}</b>
        </p>
      </div>
      <div className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">Manual payment instructions</h2>
        <p className="text-sm text-slate-300">
          Please send payment to our payment account and message our admin on WhatsApp. After payment
          confirmation, your booking status will change to <b>paid</b>, and you can open your QR ticket.
        </p>
      </div>
      <Link className="button button-primary inline-block" href={`/ticket/${booking.id}`}>
        Open ticket page
      </Link>
    </div>
  );
}
