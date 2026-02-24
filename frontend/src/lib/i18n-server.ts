import type { Language, Theme } from "@/lib/i18n";

export async function getServerLanguage(): Promise<Language> {
  return "ru";
}

export async function getServerTheme(): Promise<Theme> {
  return "light";
}
