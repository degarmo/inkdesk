import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

/** Clears a stale JWT (shop/user gone after seed or delete) and returns to login. */
export async function GET(request: Request) {
  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
