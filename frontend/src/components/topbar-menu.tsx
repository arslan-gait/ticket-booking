"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppSettings } from "@/components/app-settings-provider";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-auth";
import { adminLogout } from "@/lib/api";

export default function TopbarMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { tr } = useAppSettings();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = useMemo(() => {
    return [{ href: "/", label: tr("navEvents") }];
  }, [tr]);

  function isActivePath(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const isAdminRoute = pathname.startsWith("/ticket-admin");

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await adminLogout();
    } finally {
      router.replace(ADMIN_LOGIN_PATH);
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
      <Link href="/">
        <img
          src="/static/logo.png"
          alt={tr("brand")}
          className="h-7 w-auto"
        />
      </Link>
      <div className="ml-auto flex items-center gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = isActivePath(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-[var(--foreground)] hover:bg-[var(--button-secondary-bg)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {isAdminRoute && pathname !== ADMIN_LOGIN_PATH ? (
          <button
            type="button"
            className="button button-secondary whitespace-nowrap"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? `${tr("adminLogoutButton")}...` : tr("adminLogoutButton")}
          </button>
        ) : null}
      </div>
    </nav>
  );
}
