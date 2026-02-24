import EventBookingPanel from "@/components/event-booking-panel";
import { getEvent, getEventSeats } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
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
      <p className="muted">{formatDateTime(event.date)}</p>
      <p className="muted">
        {t(lang, "venueLabel")}: {seatData.venue.name}
      </p>
      <EventBookingPanel
        eventId={eventId}
        seats={seatData.seats}
        priceTiers={seatData.price_tiers}
        layoutMeta={seatData.venue.layout_meta}
      />
    </div>
  );
}
