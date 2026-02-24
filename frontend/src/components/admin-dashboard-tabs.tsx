"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminBookingsManager from "@/components/admin-bookings-manager";
import AdminEventsManager from "@/components/admin-events-manager";
import AdminVenuesManager from "@/components/admin-venues-manager";
import QrScanner from "@/components/qr-scanner";
import { useAppSettings } from "@/components/app-settings-provider";

const tabs = ["events", "venues", "bookings", "scan"] as const;
type AdminTab = (typeof tabs)[number];

function isAdminTab(value: string | null): value is AdminTab {
  return !!value && tabs.includes(value as AdminTab);
}

export default function AdminDashboardTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tr } = useAppSettings();

  const activeTab = useMemo<AdminTab>(() => {
    const raw = searchParams.get("tab");
    return isAdminTab(raw) ? raw : "events";
  }, [searchParams]);

  function setActiveTab(nextTab: AdminTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label={tr("adminDashboard")}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "events"}
          className={`button ${activeTab === "events" ? "button-primary" : "button-secondary"}`}
          onClick={() => setActiveTab("events")}
        >
          {tr("manageEvents")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "venues"}
          className={`button ${activeTab === "venues" ? "button-primary" : "button-secondary"}`}
          onClick={() => setActiveTab("venues")}
        >
          {tr("manageVenues")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "bookings"}
          className={`button ${activeTab === "bookings" ? "button-primary" : "button-secondary"}`}
          onClick={() => setActiveTab("bookings")}
        >
          {tr("manageBookings")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "scan"}
          className={`button ${activeTab === "scan" ? "button-primary" : "button-secondary"}`}
          onClick={() => setActiveTab("scan")}
        >
          {tr("scanTicketQr")}
        </button>
      </div>

      {activeTab === "events" ? <AdminEventsManager /> : null}
      {activeTab === "venues" ? <AdminVenuesManager /> : null}
      {activeTab === "bookings" ? <AdminBookingsManager /> : null}
      {activeTab === "scan" ? (
        <div className="space-y-2">
          <p className="muted">{tr("scanHint")}</p>
          <QrScanner />
        </div>
      ) : null}
    </div>
  );
}
