import Link from "next/link";
import { getEvents } from "@/lib/api";
import LocalDateTime from "@/components/local-date-time";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

function formatFromPrice(priceTiers: Record<string, number>): string | null {
  const prices = Object.values(priceTiers).filter((price) => Number.isFinite(price) && price > 0);
  if (prices.length === 0) return null;
  const minPrice = Math.min(...prices);
  return `от ${new Intl.NumberFormat("ru-RU").format(minPrice)} ₸`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-[var(--muted)]">
      <path
        d="M7 3v2m10-2v2M4 9h16m-1 11H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-[var(--muted)]">
      <path
        d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

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
          {events.map((event) => {
            const fromPriceLabel = formatFromPrice(event.price_tiers ?? {});
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group block rounded-2xl bg-[var(--bg-elev)]/60 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {event.image ? (
                  <div className="flex h-80 w-full items-center justify-center bg-transparent">
                    <img
                      src={event.image}
                      alt={event.name}
                      className="h-full w-auto max-w-full rounded-2xl object-contain transition duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="h-80 w-full rounded-2xl bg-[var(--bg)]" />
                )}

                <article className="px-1 pt-3 pb-1">
                  <div className="space-y-3">
                    <h2 className="line-clamp-2 text-xl font-semibold leading-tight">{event.name}</h2>

                    <p className="flex items-center gap-2 text-base text-[var(--muted)]">
                      <CalendarIcon />
                      <span>
                        <LocalDateTime value={event.date} />
                      </span>
                    </p>

                    <p className="flex items-center gap-2 text-base text-[var(--muted)]">
                      <LocationIcon />
                      <span className="line-clamp-1">{event.venue_name}</span>
                    </p>

                    <div className="flex items-center justify-end pt-1">
                      <span className="button button-primary shrink-0">
                        {fromPriceLabel ? `${fromPriceLabel} · ${t(lang, "bookSeats")}` : t(lang, "bookSeats")}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
