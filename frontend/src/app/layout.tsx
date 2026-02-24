import type { Metadata } from "next";
import AppSettingsProvider from "@/components/app-settings-provider";
import TopbarMenu from "@/components/topbar-menu";
import { getServerLanguage, getServerTheme } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticket Booking",
  description: "Event ticket booking app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [initialLang, initialTheme] = await Promise.all([getServerLanguage(), getServerTheme()]);

  return (
    <html lang={initialLang} data-theme={initialTheme}>
      <body>
        <AppSettingsProvider initialLang={initialLang} initialTheme={initialTheme}>
          <header className="border-b border-[var(--border)]">
            <TopbarMenu />
          </header>
          <main className="mx-auto max-w-6xl p-4">{children}</main>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
