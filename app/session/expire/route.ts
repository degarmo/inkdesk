import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { clearCookieOptions } from "@/lib/cookie-options";

/** Clears a stale JWT (shop/user gone after seed or delete) and returns to login. */
export async function GET(request: Request) {
  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(SESSION_COOKIE, "", clearCookieOptions());
  return response;
}
