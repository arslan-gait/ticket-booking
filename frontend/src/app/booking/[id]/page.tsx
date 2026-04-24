import Link from "next/link";
import TicketQr from "@/components/ticket-qr";
import { getBooking } from "@/lib/api";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

type Params = { id: string };

export default async function BookingPage({ params }: { params: Promise<Params> }) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const booking = await getBooking(id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {t(lang, "bookingSuccess")}
      </h1>
      <div className="card space-y-2 p-4">
        <p>
          {t(lang, "name")}: <b>{booking.customer_name}</b>
        </p>
        <p>
          {t(lang, "whatsapp")}: <b>{booking.phone_number}</b>
        </p>
        <p>
          {t(lang, "event")}: <b>{booking.event_name}</b>
        </p>
        <p>
          {t(lang, "venue")}: <b>{booking.venue_name}</b>
        </p>
        <p>
          {t(lang, "status")}: <b>{booking.status}</b>
        </p>
        <p>
          {t(lang, "total")}: <b>{booking.total_price} ₸</b>
        </p>
      </div>
      <div className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">{t(lang, "manualPaymentTitle")}</h2>
        <p className="muted text-sm">{t(lang, "manualPaymentText")}</p>
      </div>
      <div className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold">{t(lang, "yourTicket")}</h2>
        {booking.ticket?.qr_data ? <TicketQr value={booking.ticket.qr_data} /> : <p className="text-red-400">{t(lang, "qrMissing")}</p>}
      </div>
      <Link className="button button-primary inline-block" href={`/ticket/${booking.public_token}`}>
        {t(lang, "openTicketPage")}
      </Link>
    </div>
  );
}
