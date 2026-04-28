import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeUserRole, USER_ROLE_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/ticket-admin") {
    return NextResponse.next();
  }

  const role = normalizeUserRole(request.cookies.get(USER_ROLE_COOKIE)?.value);
  if (role === "admin") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/ticket-admin", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/ticket-admin/:path*"],
};
