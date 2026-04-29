import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/require-admin-session";

export default async function TicketAdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminSession();
  return children;
}
