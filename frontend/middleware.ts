import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_KEY,
  SERVER_API_BASE,
} from "@/lib/admin-auth";

async function hasValidAdminSession(
  request: NextRequest,
  accessToken?: string,
): Promise<boolean> {
  const token = accessToken ?? request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return false;

  const response = await fetch(`${SERVER_API_BASE}/auth/me/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "accept-language": request.headers.get("accept-language") ?? "ru",
    },
    cache: "no-store",
  });
  return response.ok;
}

async function refreshAdminAccessToken(request: NextRequest): Promise<string | null> {
  const refreshToken = request.cookies.get(ADMIN_REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  const response = await fetch(`${SERVER_API_BASE}/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept-language": request.headers.get("accept-language") ?? "ru",
    },
    body: JSON.stringify({ [REFRESH_TOKEN_KEY]: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const raw = await response.text();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { access?: string };
    return parsed.access ?? null;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/ticket-admin")) return NextResponse.next();

  if (pathname === ADMIN_LOGIN_PATH) {
    const canAccess = await hasValidAdminSession(request);
    if (canAccess) {
      return NextResponse.redirect(new URL(ADMIN_DASHBOARD_PATH, request.url));
    }
    return NextResponse.next();
  }

  const canAccess = await hasValidAdminSession(request);
  if (canAccess) return NextResponse.next();

  const refreshedAccessToken = await refreshAdminAccessToken(request);
  if (!refreshedAccessToken) return redirectToLogin(request);
  const hasStaffSession = await hasValidAdminSession(request, refreshedAccessToken);
  if (!hasStaffSession) return redirectToLogin(request);

  // Refresh succeeded, then force a same-URL reload so refreshed cookies are applied.
  const response = NextResponse.redirect(request.nextUrl.clone());
  response.cookies.set(ADMIN_ACCESS_TOKEN_COOKIE, refreshedAccessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
  return response;
}

export const config = {
  matcher: ["/ticket-admin/:path*"],
};
