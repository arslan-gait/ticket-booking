import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticket Booking",
  description: "Event ticket booking app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-700">
          <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
            <Link href="/" className="font-bold text-xl">
              TicketHub
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/">Events</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/admin/scan">Scan QR</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
