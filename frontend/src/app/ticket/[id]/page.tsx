import TicketQr from "@/components/ticket-qr";
import { getBooking } from "@/lib/api";

type Params = { id: string };

export default async function TicketPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const booking = await getBooking(Number(id));

  if (booking.status !== "paid") {
    return (
      <div className="card p-4">
        <h1 className="text-2xl font-bold">Ticket not active yet</h1>
        <p className="mt-2 text-slate-300">
          Your booking status is <b>{booking.status}</b>. The QR code appears after manual payment
          confirmation by admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Your Event Ticket</h1>
      <div className="card p-4">
        <p>
          Name: <b>{booking.customer_name}</b>
        </p>
        <p>
          Event: <b>{booking.event_name}</b>
        </p>
        <p>
          Date: <b>{new Date(booking.event_date).toLocaleString()}</b>
        </p>
      </div>
      {booking.ticket?.qr_data ? (
        <TicketQr value={booking.ticket.qr_data} />
      ) : (
        <p className="text-red-400">QR data is missing for this ticket.</p>
      )}
    </div>
  );
}
