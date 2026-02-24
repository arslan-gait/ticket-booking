import EventBookingPanel from "@/components/event-booking-panel";
import { getEvent, getEventSeats } from "@/lib/api";

type Params = { id: string };

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const eventId = Number(id);
  const [event, seatData] = await Promise.all([getEvent(eventId), getEventSeats(eventId)]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{event.name}</h1>
      <p className="text-slate-300">{new Date(event.date).toLocaleString()}</p>
      <p className="text-slate-300">Venue: {seatData.venue.name}</p>
      <EventBookingPanel eventId={eventId} seats={seatData.seats} priceTiers={seatData.price_tiers} />
    </div>
  );
}
