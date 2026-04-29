import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
} from "@/lib/admin-auth";

async function hasValidAdminSession(request: NextRequest): Promise<boolean> {
  const response = await fetch(new URL("/api/admin/auth/me", request.url), {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      "accept-language": request.headers.get("accept-language") ?? "ru",
    },
    cache: "no-store",
  });
  return response.ok;
}

async function refreshAdminAccessToken(request: NextRequest): Promise<Response> {
  return fetch(new URL("/api/admin/auth/refresh", request.url), {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      "accept-language": request.headers.get("accept-language") ?? "ru",
    },
    cache: "no-store",
  });
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

  const refreshResponse = await refreshAdminAccessToken(request);
  if (!refreshResponse.ok) return redirectToLogin(request);

  // Refresh succeeded, then force a same-URL reload so refreshed cookies are applied.
  const response = NextResponse.redirect(request.nextUrl.clone());
  const setCookie = refreshResponse.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie);
  return response;
}

export const config = {
  matcher: ["/ticket-admin/:path*"],
};
