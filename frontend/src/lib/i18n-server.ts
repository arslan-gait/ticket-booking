import { cookies } from "next/headers";
import { normalizeLanguage, normalizeTheme, type Language, type Theme } from "@/lib/i18n";

export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return normalizeLanguage(cookieStore.get("app_lang")?.value);
}

export async function getServerTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return normalizeTheme(cookieStore.get("app_theme")?.value);
}
