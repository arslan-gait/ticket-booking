import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ACCESS_TOKEN_COOKIE, SERVER_API_BASE } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const access = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const response = await fetch(`${SERVER_API_BASE}/auth/me/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${access}`,
      "Accept-Language": request.headers.get("accept-language") ?? "ru",
    },
    cache: "no-store",
  });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
