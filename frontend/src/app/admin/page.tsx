import Link from "next/link";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function AdminPage() {
  const lang = await getServerLanguage();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(lang, "adminDashboard")}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/events" className="card p-4">
          {t(lang, "manageEvents")}
        </Link>
        <Link href="/admin/venues" className="card p-4">
          {t(lang, "manageVenues")}
        </Link>
        <Link href="/admin/bookings" className="card p-4">
          {t(lang, "manageBookings")}
        </Link>
      </div>
    </div>
  );
}
