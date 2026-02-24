"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSettings } from "@/components/app-settings-provider";

export default function TopbarMenu() {
  const pathname = usePathname();
  const { tr } = useAppSettings();
  const navItems = [
    { href: "/", label: tr("navEvents") },
    { href: "/admin", label: tr("navAdmin") },
  ];

  function isActivePath(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
      <Link href="/" className="mr-auto text-xl font-bold tracking-tight">
        {tr("brand")}
      </Link>
      <div className="order-3 flex w-full items-center gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 sm:order-2 sm:w-auto sm:flex-1 sm:justify-center">
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
      </div>
    </nav>
  );
}
