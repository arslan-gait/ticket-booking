import { Suspense } from "react";
import AdminDashboardTabs from "@/components/admin-dashboard-tabs";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function AdminDashboardPage() {
  const lang = await getServerLanguage();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(lang, "adminDashboard")}</h1>
      <Suspense fallback={<div className="muted">Loading...</div>}>
        <AdminDashboardTabs />
      </Suspense>
    </div>
  );
}
