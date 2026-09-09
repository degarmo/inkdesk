import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Expose the path to server layouts so incomplete shops can still open parlor settings. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-inkdesk-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
