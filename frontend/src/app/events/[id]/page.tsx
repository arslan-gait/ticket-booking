import EventBookingPanel from "@/components/event-booking-panel";
import { getEvent, getEventSeats } from "@/lib/api";
import LocalDateTime from "@/components/local-date-time";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

type Params = { id: string };

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const eventId = Number(id);
  const [event, seatData] = await Promise.all([getEvent(eventId), getEventSeats(eventId)]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{event.name}</h1>
      <div className="card p-4">
        <div className="mx-auto w-full max-w-sm">
          {event.image ? (
            <img
              src={event.image}
              alt={event.name}
              className="h-64 w-full rounded-xl object-contain"
            />
          ) : (
            <div className="h-64 w-full rounded-xl bg-[var(--bg)]" />
          )}
          <p className="mt-3 text-center text-base font-semibold">{event.name}</p>
        </div>
      </div>
      <p className="muted">{<LocalDateTime value={event.date} />}</p>
      <p className="muted">
        {t(lang, "venueLabel")}: {seatData.venue.name}
      </p>
      {seatData.venue.address_line ? (
        <p className="muted">
          {t(lang, "addressLine")}: {seatData.venue.address_line}
        </p>
      ) : null}
      <EventBookingPanel
        eventId={eventId}
        seats={seatData.seats}
        priceTiers={seatData.price_tiers}
        layoutMeta={seatData.venue.layout_meta}
      />
    </div>
  );
}
