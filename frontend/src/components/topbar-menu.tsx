"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppSettings } from "@/components/app-settings-provider";
import type { Language } from "@/lib/i18n";

export default function TopbarMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, theme, setLang, toggleTheme, tr } = useAppSettings();
  const navItems = [
    { href: "/", label: tr("navEvents") },
    { href: "/admin", label: tr("navAdmin") },
    { href: "/admin/scan", label: tr("navScan") },
  ];

  function isActivePath(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLangChange(nextLang: Language) {
    setLang(nextLang);
    router.refresh();
  }

  function handleThemeToggle() {
    toggleTheme();
    router.refresh();
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
      <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
        <label htmlFor="topbar-language" className="sr-only">
          {tr("language")}
        </label>
        <select
          id="topbar-language"
          className="input-field h-9 w-20 px-2 text-sm"
          value={lang}
          onChange={(e) => handleLangChange(e.target.value as Language)}
          aria-label={tr("language")}
          title={tr("language")}
        >
          <option value="ru">RU</option>
          <option value="en">EN</option>
        </select>
        <button
          className="button button-secondary h-9 px-3 text-sm whitespace-nowrap"
          onClick={handleThemeToggle}
          aria-label={theme === "light" ? tr("switchToDark") : tr("switchToLight")}
          title={theme === "light" ? tr("switchToDark") : tr("switchToLight")}
        >
          {theme === "light" ? tr("darkMode") : tr("lightMode")}
        </button>
      </div>
    </nav>
  );
}
