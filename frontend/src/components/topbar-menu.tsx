"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSettings } from "@/components/app-settings-provider";
import type { Language } from "@/lib/i18n";

export default function TopbarMenu() {
  const router = useRouter();
  const { lang, theme, setLang, toggleTheme, tr } = useAppSettings();

  function handleLangChange(nextLang: Language) {
    setLang(nextLang);
    router.refresh();
  }

  function handleThemeToggle() {
    toggleTheme();
    router.refresh();
  }

  return (
    <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
      <Link href="/" className="font-bold text-xl">
        {tr("brand")}
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <Link href="/">{tr("navEvents")}</Link>
        <Link href="/admin">{tr("navAdmin")}</Link>
        <Link href="/admin/scan">{tr("navScan")}</Link>
        <select
          className="input-field h-9"
          value={lang}
          onChange={(e) => handleLangChange(e.target.value as Language)}
          aria-label={tr("language")}
          title={tr("language")}
        >
          <option value="ru">RU</option>
          <option value="en">EN</option>
        </select>
        <button className="button button-secondary h-9 px-3" onClick={handleThemeToggle}>
          {theme === "light" ? tr("switchToDark") : tr("switchToLight")}
        </button>
      </div>
    </nav>
  );
}
