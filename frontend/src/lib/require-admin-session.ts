import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_LOGIN_PATH,
  SERVER_API_BASE,
} from "@/lib/admin-auth";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const access = cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!access) {
    redirect(ADMIN_LOGIN_PATH);
  }

  const response = await fetch(`${SERVER_API_BASE}/auth/me/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${access}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    redirect(ADMIN_LOGIN_PATH);
  }
}
