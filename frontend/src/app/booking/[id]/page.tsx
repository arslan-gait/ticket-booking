import Link from "next/link";
import { getBooking } from "@/lib/api";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

type Params = { id: string };

export default async function BookingPage({ params }: { params: Promise<Params> }) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const booking = await getBooking(Number(id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {t(lang, "booking")} #{booking.id}
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
      <Link className="button button-primary inline-block" href={`/ticket/${booking.id}`}>
        {t(lang, "openTicketPage")}
      </Link>
    </div>
  );
}
