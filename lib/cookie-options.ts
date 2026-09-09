/** HTTPS-only cookies on Render (`NODE_ENV=production`). Local dev stays HTTP. */
export function cookieSecure() {
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function clearCookieOptions() {
  return sessionCookieOptions(0);
}
