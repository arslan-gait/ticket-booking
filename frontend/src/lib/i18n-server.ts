import { cookies } from "next/headers";
import { normalizeTheme, type Language, type Theme } from "@/lib/i18n";

export async function getServerLanguage(): Promise<Language> {
  return "ru";
}

export async function getServerTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return normalizeTheme(cookieStore.get("app_theme")?.value);
}
