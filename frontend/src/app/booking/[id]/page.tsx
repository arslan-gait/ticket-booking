import Link from "next/link";
import { getBooking } from "@/lib/api";
import { t, translateBookingStatus } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";
import ImageLightbox from "@/components/image-lightbox";

type Params = { id: string };

export default async function BookingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const booking = await getBooking(id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(lang, "bookingSuccess")}</h1>
      <div className="card p-4">
        <div className="mx-auto w-full max-w-sm">
          {booking.event_image ? (
            <ImageLightbox
              src={booking.event_image}
              alt={booking.event_name}
              className="h-64 w-full rounded-xl object-contain"
            />
          ) : (
            <div className="h-64 w-full rounded-xl bg-[var(--bg)]" />
          )}
          <p className="mt-3 text-center text-base font-semibold">
            {booking.event_name}
          </p>
        </div>
      </div>
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
        {booking.venue_address_line ? (
          <p>
            {t(lang, "addressLine")}: <b>{booking.venue_address_line}</b>
          </p>
        ) : null}
        <p>
          {t(lang, "status")}:{" "}
          <b>{translateBookingStatus(lang, booking.status)}</b>
        </p>
        <p>
          {t(lang, "total")}: <b>{booking.total_price} ₸</b>
        </p>
      </div>
      <div className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">
          {t(lang, "manualPaymentTitle")}
        </h2>
        <p className="muted text-sm">{t(lang, "manualPaymentText")}</p>
      </div>
      <Link
        className="button button-primary inline-block"
        href={`/ticket/${booking.public_token}`}
      >
        {t(lang, "openTicketPage")}
      </Link>
    </div>
  );
}
