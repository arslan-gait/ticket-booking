import TicketQr from "@/components/ticket-qr";
import { getBooking } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

type Params = { id: string };

export default async function TicketPage({ params }: { params: Promise<Params> }) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const booking = await getBooking(id);

  if (booking.status !== "paid") {
    return (
      <div className="card p-4">
        <h1 className="text-2xl font-bold">{t(lang, "ticketNotActive")}</h1>
        <p className="muted mt-2">
          {t(lang, "ticketNotActiveText", { status: booking.status })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(lang, "yourTicket")}</h1>
      <div className="card p-4">
        <p>
          {t(lang, "name")}: <b>{booking.customer_name}</b>
        </p>
        <p>
          {t(lang, "event")}: <b>{booking.event_name}</b>
        </p>
        <p>
          {t(lang, "date")}: <b>{formatDateTime(booking.event_date)}</b>
        </p>
      </div>
      {booking.ticket?.qr_data ? (
        <TicketQr value={booking.ticket.qr_data} />
      ) : (
        <p className="text-red-400">{t(lang, "qrMissing")}</p>
      )}
    </div>
  );
}
