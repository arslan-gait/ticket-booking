import Link from "next/link";
import { getEvents } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function HomePage() {
  const lang = await getServerLanguage();
  const events = await getEvents();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t(lang, "upcomingEvents")}</h1>
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
          {events.length}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="card rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elev)]/40 p-8 text-center">
          <p className="text-sm text-[var(--muted)]">{t(lang, "upcomingEvents")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <article
              key={event.id}
              className="card group flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-elev)]/50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-md"
            >
              <div className="mb-3">
                <h2 className="text-lg font-semibold leading-tight">{event.name}</h2>
              </div>

              <div className="space-y-1.5 text-sm text-[var(--muted)]">
                <p className="rounded-md bg-[var(--bg)]/60 px-2.5 py-1.5">{event.venue_name}</p>
                <p className="rounded-md bg-[var(--bg)]/60 px-2.5 py-1.5">
                  {formatDateTime(event.date)}
                </p>
              </div>

              <div className="mt-4">
                <Link className="button button-primary inline-flex w-full justify-center" href={`/events/${event.id}`}>
                  {t(lang, "bookSeats")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
