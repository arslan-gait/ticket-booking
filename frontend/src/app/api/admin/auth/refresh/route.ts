import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_KEY,
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_KEY,
  SERVER_API_BASE,
} from "@/lib/admin-auth";
import { readJsonOrDetail } from "../_utils";

type RefreshResponse = {
  access?: string;
  detail?: string;
};

async function isStaffAccessTokenValid(access: string, language: string): Promise<boolean> {
  const response = await fetch(`${SERVER_API_BASE}/auth/me/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${access}`,
      "Accept-Language": language,
    },
    cache: "no-store",
  });
  return response.ok;
}

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(ADMIN_REFRESH_TOKEN_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ detail: "Refresh token missing." }, { status: 401 });
  }
  const language = request.headers.get("accept-language") ?? "ru";

  const response = await fetch(`${SERVER_API_BASE}/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": language,
    },
    body: JSON.stringify({ [REFRESH_TOKEN_KEY]: refresh }),
    cache: "no-store",
  });
  const payload = await readJsonOrDetail<RefreshResponse>(response);
  if (!response.ok || !payload.access) {
    const denied = NextResponse.json(
      { detail: payload.detail ?? "Session expired." },
      { status: 401 },
    );
    denied.cookies.delete(ADMIN_ACCESS_TOKEN_COOKIE);
    denied.cookies.delete(ADMIN_REFRESH_TOKEN_COOKIE);
    return denied;
  }

  const isStaffAccess = await isStaffAccessTokenValid(payload.access, language);
  if (!isStaffAccess) {
    const denied = NextResponse.json({ detail: "Staff account is required." }, { status: 401 });
    denied.cookies.delete(ADMIN_ACCESS_TOKEN_COOKIE);
    denied.cookies.delete(ADMIN_REFRESH_TOKEN_COOKIE);
    return denied;
  }

  const ok = NextResponse.json({ ok: true }, { status: 200 });
  ok.cookies.set(ADMIN_ACCESS_TOKEN_COOKIE, payload[ACCESS_TOKEN_KEY], {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
  return ok;
}
