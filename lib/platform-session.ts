import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { PLATFORM_COOKIE, SESSION_DAYS } from "./constants";
import { clearCookieOptions, sessionCookieOptions } from "./cookie-options";

export type PlatformSession = {
  id: string;
  email: string;
  name: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signPlatformSession(user: PlatformSession) {
  return new SignJWT({
    kind: "platform",
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function readPlatformSession(token: string): Promise<PlatformSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.kind !== "platform" || !payload.sub || typeof payload.email !== "string") {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return null;
  }
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const jar = await cookies();
  const token = jar.get(PLATFORM_COOKIE)?.value;
  if (!token) return null;
  return readPlatformSession(token);
}

export async function setPlatformSessionCookie(user: PlatformSession) {
  const token = await signPlatformSession(user);
  const jar = await cookies();
  jar.set(PLATFORM_COOKIE, token, sessionCookieOptions(SESSION_DAYS * 24 * 60 * 60));
}

export async function clearPlatformSessionCookie() {
  const jar = await cookies();
  jar.set(PLATFORM_COOKIE, "", clearCookieOptions());
}
