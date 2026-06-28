import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "./types";

const COOKIE_NAME = "quiniela_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  return new TextEncoder().encode(s);
}

/** Create a signed session cookie for the given user. */
export async function setSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    phone: user.phone,
    display_name: user.display_name,
    is_admin: user.is_admin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Returns the current session user, or null if not logged in / invalid. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.sub as string,
      phone: payload.phone as string,
      display_name: payload.display_name as string,
      is_admin: Boolean(payload.is_admin),
    };
  } catch {
    return null;
  }
}

/** For server components / route handlers: redirect to /login if not authed. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.is_admin) redirect("/");
  return user;
}
