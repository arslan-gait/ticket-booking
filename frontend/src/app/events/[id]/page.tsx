import EventBookingPanel from "@/components/event-booking-panel";
import { getEvent, getEventSeats } from "@/lib/api";
import LocalDateTime from "@/components/local-date-time";
import ImageLightbox from "@/components/image-lightbox";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

type Params = { id: string };

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const lang = await getServerLanguage();
  const { id } = await params;
  const eventId = Number(id);
  const [event, seatData] = await Promise.all([getEvent(eventId), getEventSeats(eventId)]);

  return (
    <div className="space-y-6">
      <section className="card p-4 md:p-6">
        <div className="grid items-start gap-4 md:grid-cols-[280px_1fr]">
          <div className="w-full">
            {event.image ? (
              <ImageLightbox
                src={event.image}
                alt={event.name}
                className="h-full w-auto max-w-full rounded-2xl object-contain transition duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="h-64 w-full rounded-[2.25rem] bg-[var(--background)]" />
            )}
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold md:text-3xl">{event.name}</h1>
            <p className="muted text-sm">
              <LocalDateTime value={event.date} />
            </p>
            {event.description ? <p className="muted">{event.description}</p> : null}
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1">
                {t(lang, "venueLabel")}: {seatData.venue.name}
              </span>
              {seatData.venue.address_line ? (
                <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1">
                  {t(lang, "addressLine")}: {seatData.venue.address_line}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <EventBookingPanel
        eventId={eventId}
        seats={seatData.seats}
        priceTiers={seatData.price_tiers}
        layoutMeta={seatData.venue.layout_meta}
      />
    </div>
  );
}
