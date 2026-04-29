import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_KEY,
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_KEY,
  SERVER_API_BASE,
} from "@/lib/admin-auth";

type LoginResponse = {
  access?: string;
  refresh?: string;
  detail?: string;
  user?: {
    username: string;
    is_staff: boolean;
    is_active: boolean;
  };
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await fetch(`${SERVER_API_BASE}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": request.headers.get("accept-language") ?? "ru",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json()) as LoginResponse;
  if (!response.ok || !payload.access || !payload.refresh) {
    return NextResponse.json(
      { detail: payload.detail ?? "Authentication failed." },
      { status: response.status },
    );
  }

  const result = NextResponse.json(
    {
      user: payload.user ?? null,
    },
    { status: 200 },
  );
  const secure = process.env.NODE_ENV === "production";
  result.cookies.set(ADMIN_ACCESS_TOKEN_COOKIE, payload[ACCESS_TOKEN_KEY], {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
  result.cookies.set(ADMIN_REFRESH_TOKEN_COOKIE, payload[REFRESH_TOKEN_KEY], {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return result;
}
