import Link from "next/link";
import { getEvents } from "@/lib/api";

export default async function HomePage() {
  const events = await getEvents();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Upcoming Events</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="card p-4">
            <h2 className="text-xl font-semibold">{event.name}</h2>
            <p className="text-sm text-slate-300">{event.venue_name}</p>
            <p className="text-sm text-slate-300">{new Date(event.date).toLocaleString()}</p>
            <p className="mt-2 text-sm text-slate-200">{event.description || "No description."}</p>
            <Link className="button button-primary mt-4 inline-block" href={`/events/${event.id}`}>
              Book Seats
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
