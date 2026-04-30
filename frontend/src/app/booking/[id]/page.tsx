import { getBooking } from "@/lib/api";
import { t, translateBookingStatus } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";
import ImageLightbox from "@/components/image-lightbox";
import BookingSuccessOverlay from "@/components/booking-success-overlay";
import CheckCircleIcon from "@/components/icons/check-circle-icon";
import ClockIcon from "@/components/icons/clock-icon";
import XCircleIcon from "@/components/icons/x-circle-icon";
import UserIcon from "@/components/icons/user-icon";
import WhatsappIcon from "@/components/icons/whatsapp-icon";
import CreditCardIcon from "@/components/icons/credit-card-icon";
import MapPinIcon from "@/components/icons/map-pin-icon";
import DetailRow from "@/components/detail-row";
import NavButton from "@/components/nav-button";
import InfoIcon from "@/components/icons/info-icon";
import SharePrintButtons from "@/components/share-print-buttons";

type Params = { id: string };

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ new?: string }>;
}) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const booking = await getBooking(id);
  const isBookingPending = booking.status === "pending";
  const isBookingPaid = booking.status === "paid";
  const isBookingCancelled = booking.status === "cancelled";
  const place = booking.venue_address_line
    ? `${booking.venue_name}, ${booking.venue_address_line}`
    : booking.venue_name;

  return (
    <div className="flex flex-col lg:w-240 mx-auto">
      {isNew === "1" && (
        <BookingSuccessOverlay
          message={t(lang, "bookingSuccess")}
          instruction={t(lang, "manualPaymentTextSuccess")}
        />
      )}

      <div className="relative flex items-center justify-center p-5 border-b border-gray-200">
        <div
          className={`flex items-center justify-center gap-2 w-60 h-16 rounded-3xl ${isBookingPending && "bg-amber-500/20"} ${isBookingCancelled && "bg-red-500/20"} ${isBookingPaid && "bg-emerald-600/20"}`}
        >
          {isBookingPaid && (
            <CheckCircleIcon className="w-10 h-10 text-emerald-600" />
          )}
          {isBookingPending && (
            <ClockIcon className="w-10 h-10 text-amber-500" />
          )}
          {isBookingCancelled && (
            <XCircleIcon className="w-10 h-10 text-red-500" />
          )}
          <span
            className={`${"text-lg font-semibold"} ${isBookingPending && "text-amber-500"} ${isBookingCancelled && "text-red-500"} ${isBookingPaid && "text-emerald-600"}`}
          >
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
              className="h-64 w-full  rounded-xl object-contain"
            />
          ) : (
            <div className="h-64 w-full rounded-xl bg-(--bg)" />
          )}
        </div>
        <p className="text-base font-semibold">{booking.event_name}</p>
      </div>

      <div
        className={`grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-5 p-5 ${isBookingPaid && "border-b border-gray-200"}`}
      >
        <DetailRow
          icon={<UserIcon className="size-5" />}
          label={t(lang, "name")}
          value={booking.customer_name}
        />
        <DetailRow
          icon={<WhatsappIcon className="size-8" />}
          label={t(lang, "whatsapp")}
          value={booking.phone_number}
        />
        <DetailRow
          icon={<CreditCardIcon className="size-5" />}
          label={t(lang, "total")}
          value={`${booking.total_price} ₸`}
        />
        <DetailRow
          icon={<MapPinIcon className="size-5" />}
          label={t(lang, "place")}
          value={place}
        />
      </div>

      {isBookingCancelled && (
        <div className="grid grid-cols-[auto_1fr] gap-3 p-5 rounded-xl bg-red-50">
          <div className="size-12 rounded-full flex items-center justify-center shrink-0">
            <XCircleIcon className="size-10 text-red-500" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-black">
              {t(lang, "cause")}
            </span>
            <span className="text-base text-black">
              {booking.commentary || t(lang, "unknown")}
            </span>
          </div>
        </div>
      )}

      {isBookingPending && (
        <div className="grid grid-cols-[auto_1fr] gap-3 p-5 rounded-xl bg-[#EEF4FF]">
          <div className="size-12 rounded-full flex items-center justify-center shrink-0">
            <InfoIcon className="size-10 text-blue-700" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-black">
              {t(lang, "manualPaymentTitle")}
            </span>
            <span className="text-base text-black">
              {t(lang, "manualPaymentText")}
            </span>
          </div>
        </div>
      )}

      <div className="p-5 flex justify-around">
        <NavButton
          className="button button-primary w-64 text-center"
          href={`/ticket/${booking.public_token}`}
          disabled={!isBookingPaid}
        >
          {t(lang, "openTicketPage")}
        </NavButton>
      </div>
    </div>
  );
}
