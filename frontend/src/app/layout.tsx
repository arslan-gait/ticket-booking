import type { Metadata } from "next";
import AppSettingsProvider from "@/components/app-settings-provider";
import TopbarMenu from "@/components/topbar-menu";
import { getServerLanguage, getServerTheme } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticket Booking",
  description: "Event ticket booking app",
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [initialLang, initialTheme] = await Promise.all([getServerLanguage(), getServerTheme()]);

  return (
    <html lang={initialLang} data-theme={initialTheme} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppSettingsProvider initialLang={initialLang} initialTheme={initialTheme}>
          <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
            <TopbarMenu />
          </header>
          <main className="mx-auto max-w-6xl p-4">{children}</main>
        </AppSettingsProvider>
      </body>
    </html>
  );
}
