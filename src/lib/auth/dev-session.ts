import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { sessionSecret } from "../env";

export const DEV_SESSION_COOKIE = "ptr_dev_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export async function createDevSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .setIssuer("patronos-dev-auth")
    .sign(sessionSecret());
  const store = await cookies();
  store.set(DEV_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.DEV_AUTH_LOCAL_TEST,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readDevSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(DEV_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { issuer: "patronos-dev-auth", algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function clearDevSession() {
  const store = await cookies();
  store.delete(DEV_SESSION_COOKIE);
}
