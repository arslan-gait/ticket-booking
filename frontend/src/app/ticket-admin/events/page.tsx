import AdminEventsManager from "@/components/admin-events-manager";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function AdminEventsPage() {
  const lang = await getServerLanguage();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{t(lang, "manageEvents")}</h1>
      <AdminEventsManager />
    </div>
  );
}
