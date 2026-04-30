import TicketQr from "@/components/ticket-qr";
import ImageLightbox from "@/components/image-lightbox";
import { getBooking } from "@/lib/api";
import LocalDateTime from "@/components/local-date-time";
import { t, translateBookingStatus } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";
import CheckCircleIcon from "@/components/icons/check-circle-icon";
import ClockIcon from "@/components/icons/clock-icon";
import XCircleIcon from "@/components/icons/x-circle-icon";
import UserIcon from "@/components/icons/user-icon";
import MapPinIcon from "@/components/icons/map-pin-icon";
import DetailRow from "@/components/detail-row";
import SharePrintButtons from "@/components/share-print-buttons";

type Params = { id: string };

export default async function TicketPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const booking = await getBooking(id);
  const isBookingPaid = booking.status === "paid";
  const isBookingPending = booking.status === "pending";
  const isBookingCancelled = booking.status === "cancelled";
  const place = booking.venue_address_line
    ? `${booking.venue_name}, ${booking.venue_address_line}`
    : booking.venue_name;

  if (!isBookingPaid) {
    return (
      <div className="flex flex-col lg:w-240 mx-auto">
        <div className="flex items-center justify-center p-5 border-b border-gray-200">
          <div
            className={`flex items-center justify-center gap-2 w-60 h-16 rounded-3xl ${isBookingPending && "bg-amber-500/20"} ${isBookingCancelled && "bg-red-500/20"}`}
          >
            {isBookingPending && (
              <ClockIcon className="w-10 h-10 text-amber-500" />
            )}
            {isBookingCancelled && (
              <XCircleIcon className="w-10 h-10 text-red-500" />
            )}
            <span
              className={`text-lg font-semibold ${isBookingPending && "text-amber-500"} ${isBookingCancelled && "text-red-500"}`}
            >
              {translateBookingStatus(lang, booking.status)}
            </span>
          </div>
        </div>
        <div className="p-5">
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
    <div className="flex flex-col lg:w-240 mx-auto">
      <div className="relative flex items-center justify-center p-5 border-b border-gray-200">
        <div className="flex items-center justify-center gap-2 w-60 h-16 rounded-3xl bg-emerald-600/20">
          <CheckCircleIcon className="w-10 h-10 text-emerald-600" />
          <span className="text-lg font-semibold text-emerald-600">
            {translateBookingStatus(lang, booking.status)}
          </span>
        </div>
        <SharePrintButtons />
      </div>

      <div className="flex items-start justify-start gap-10 p-5 border-b border-gray-200">
        <div className="relative size-64 shrink-0 overflow-hidden rounded-lg bg-amber-50/30 shadow-sm">
          {booking.event_image ? (
            <ImageLightbox
              src={booking.event_image}
              alt={booking.event_name}
              className="h-64 w-full rounded-xl object-contain"
            />
          ) : (
            <div className="h-64 w-full rounded-xl bg-(--bg)" />
          )}
        </div>
        <div>
          <p className="text-base font-semibold">{booking.event_name}</p>
          <p className="mt-1 text-sm text-gray-500">
            <LocalDateTime value={booking.event_date} />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-5 p-5 border-b border-gray-200">
        <DetailRow
          icon={<UserIcon className="size-5" />}
          label={t(lang, "name")}
          value={booking.customer_name}
        />
        <DetailRow
          icon={<MapPinIcon className="size-5" />}
          label={t(lang, "place")}
          value={place}
        />
      </div>

      <div className="p-5 border-b border-gray-200">
        <p className="mb-3 text-lg font-semibold">{t(lang, "yourSeats")}</p>
        {booking.items.length ? (
          <div className="flex flex-wrap gap-2">
            {booking.items.map((item) => {
              const seat = item.seat_detail;
              return (
                <span
                  key={`${seat.section}-${seat.row_label}-${seat.seat_number}`}
                  className="rounded-full border border-(--border) bg-(--background) px-3 py-1 text-sm"
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

      <div className="p-5 border-b border-gray-200">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold">QR</p>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              booking.ticket?.is_scanned
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {booking.ticket?.is_scanned
              ? t(lang, "ticketScanned")
              : t(lang, "ticketNotScanned")}
          </span>
        </div>
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
