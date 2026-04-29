import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
} from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.delete(ADMIN_ACCESS_TOKEN_COOKIE);
  response.cookies.delete(ADMIN_REFRESH_TOKEN_COOKIE);
  return response;
}
