import { NextResponse } from "next/server";
import { PLATFORM_COOKIE } from "@/lib/constants";
import { clearCookieOptions } from "@/lib/cookie-options";

/** Clears a stale platform JWT and returns to operator login. */
export async function GET(request: Request) {
  const url = new URL("/platform/login", request.url);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(PLATFORM_COOKIE, "", clearCookieOptions());
  return response;
}
