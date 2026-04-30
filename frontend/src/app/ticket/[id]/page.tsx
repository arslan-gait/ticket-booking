import TicketQr from "@/components/ticket-qr";
import { getBooking } from "@/lib/api";
import LocalDateTime from "@/components/local-date-time";
import { t, translateBookingStatus } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";
import CheckCircleIcon from "@/components/icons/check-circle-icon";
import ClockIcon from "@/components/icons/clock-icon";
import XCircleIcon from "@/components/icons/x-circle-icon";

type Params = { id: string };

function BookingStatusIcon({ status }: { status: string }) {
  if (status === "paid")
    return <CheckCircleIcon className="w-8 h-8 text-emerald-600" />;
  if (status === "pending")
    return <ClockIcon className="w-8 h-8 text-amber-500" />;
  if (status === "cancelled")
    return <XCircleIcon className="w-8 h-8 text-red-500" />;
  return null;
}

export default async function TicketPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const booking = await getBooking(id);

  if (booking.status !== "paid") {
    return (
      <div className="card p-4 flex items-start gap-3">
        <BookingStatusIcon status={booking.status} />
        <div>
          <h1 className="text-2xl font-bold">{t(lang, "ticketNotActive")}</h1>
          <p className="muted mt-2">
            {t(lang, "ticketNotActiveText", {
              status: translateBookingStatus(lang, booking.status),
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(lang, "yourTicket")}</h1>
      <div className="card p-4">
        <div className="mx-auto w-full max-w-sm">
          {booking.event_image ? (
            <img
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2 p-4">
          <p>
            {t(lang, "name")}: <b>{booking.customer_name}</b>
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
            {t(lang, "date")}:{" "}
            <b>{<LocalDateTime value={booking.event_date} />}</b>
          </p>
          <div className="flex items-center gap-2">
            <BookingStatusIcon status={booking.status} />
            <span className="text-sm font-medium">
              {translateBookingStatus(lang, booking.status)}
            </span>
          </div>
          <p>
            {t(lang, "ticketScanStatus")}:{" "}
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                booking.ticket?.is_scanned
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {booking.ticket?.is_scanned
                ? t(lang, "ticketScanned")
                : t(lang, "ticketNotScanned")}
            </span>
          </p>
        </div>
        <div className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">{t(lang, "yourSeats")}</h2>
          {booking.items.length ? (
            <div className="flex flex-wrap gap-2">
              {booking.items.map((item) => {
                const seat = item.seat_detail;
                return (
                  <span
                    key={`${seat.section}-${seat.row_label}-${seat.seat_number}`}
                    className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-sm"
                  >
                    {seat.section} {t(lang, "row")} {seat.row_label},{" "}
                    {t(lang, "seatPlace")} {seat.seat_number}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="muted text-sm">{t(lang, "noSeatDetails")}</p>
          )}
        </div>
      </div>
      <div className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">QR</h2>
        <p className="muted mb-4 text-sm">{t(lang, "ticketEntryHint")}</p>
        {booking.ticket?.qr_data ? (
          <div className="flex justify-center">
            <TicketQr value={booking.ticket.qr_data} />
          </div>
        ) : (
          <p className="text-red-400">{t(lang, "qrMissing")}</p>
        )}
      </div>
    </div>
  );
}
