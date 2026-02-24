"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeLanguage, normalizeTheme, t, type I18nKey, type Language, type Theme } from "@/lib/i18n";

type AppSettingsContextValue = {
  lang: Language;
  theme: Theme;
  setLang: (lang: Language) => void;
  toggleTheme: () => void;
  tr: (key: I18nKey, params?: Record<string, string | number>) => string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

type Props = {
  children: React.ReactNode;
  initialLang: Language;
  initialTheme: Theme;
};

export default function AppSettingsProvider({ children, initialLang, initialTheme }: Props) {
  const [lang, setLangState] = useState<Language>(normalizeLanguage(initialLang));
  const [theme, setThemeState] = useState<Theme>(normalizeTheme(initialTheme));

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.cookie = `app_lang=${lang}; path=/; max-age=31536000`;
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.cookie = `app_theme=${theme}; path=/; max-age=31536000`;
  }, [theme]);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      lang,
      theme,
      setLang: (nextLang) => setLangState(normalizeLanguage(nextLang)),
      toggleTheme: () => setThemeState((prev) => (prev === "light" ? "dark" : "light")),
      tr: (key, params) => t(lang, key, params),
    }),
    [lang, theme],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return context;
}
