import AdminBookingsManager from "@/components/admin-bookings-manager";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function AdminBookingsPage() {
  const lang = await getServerLanguage();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{t(lang, "manageBookings")}</h1>
      <AdminBookingsManager />
    </div>
  );
}
