import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
} from "@/lib/admin-auth";

export default async function TicketAdminEntryPage() {
  const access = await cookies();
  const token = access.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  redirect(token ? ADMIN_DASHBOARD_PATH : ADMIN_LOGIN_PATH);
}
