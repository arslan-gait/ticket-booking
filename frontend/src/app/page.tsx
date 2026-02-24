import Link from "next/link";
import { getEvents } from "@/lib/api";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function HomePage() {
  const lang = await getServerLanguage();
  const events = await getEvents();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(lang, "upcomingEvents")}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="card p-4">
            <h2 className="text-xl font-semibold">{event.name}</h2>
            <p className="muted text-sm">{event.venue_name}</p>
            <p className="muted text-sm">{new Date(event.date).toLocaleString()}</p>
            <p className="mt-2 text-sm">{event.description || t(lang, "noDescription")}</p>
            <Link className="button button-primary mt-4 inline-block" href={`/events/${event.id}`}>
              {t(lang, "bookSeats")}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
