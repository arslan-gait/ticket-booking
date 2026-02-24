import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/events" className="card p-4">
          Manage Events
        </Link>
        <Link href="/admin/venues" className="card p-4">
          Manage Venues
        </Link>
        <Link href="/admin/bookings" className="card p-4">
          Manage Bookings
        </Link>
      </div>
    </div>
  );
}
