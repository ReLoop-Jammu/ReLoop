import "server-only";
import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";

/*
 * Server-side helpers for routes that use the service-role key. They verify
 * the caller's session and role with the caller's own token, and never log
 * request bodies, tokens or passwords.
 */

const URL_ = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isConfigured = () => Boolean(URL_ && SERVICE_KEY);

const serviceHeaders = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
});

/** JSON response that is never cached. */
export function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const bearer = (request: Request) =>
  request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim() || null;

/** The user behind an access token, or null if the token isn't valid. */
export async function userFromToken(token: string): Promise<{ id: string; email?: string } | null> {
  const r = await fetch(`${URL_}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const user = (await r.json()) as { id?: string; email?: string };
  return user.id ? { id: user.id, ...(user.email ? { email: user.email } : {}) } : null;
}

/**
 * Whether `password` is this email's current password, checked with a
 * throwaway sign-in that is signed out again at once. Throws when the auth
 * service can't answer (rate limit, outage), so that isn't mistaken for a
 * wrong password.
 */
export async function passwordMatches(email: string, password: string): Promise<boolean> {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (r.status === 400 || r.status === 401) return false;
  if (!r.ok) throw new Error(`Password check failed (${r.status})`);
  const session = (await r.json().catch(() => ({}))) as { access_token?: string };
  if (session.access_token) {
    await fetch(`${URL_}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    }).catch(() => {});
  }
  return true;
}

/** Asks the database, as the caller, whether they are an admin (false while a password change is pending). */
export async function callerIsAdmin(token: string): Promise<boolean> {
  const r = await fetch(`${URL_}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  return r.ok && (await r.json()) === true;
}

/** REST call with the service-role key (bypasses RLS: use only after checking the caller). */
export async function serviceRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Database request failed (${r.status})`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Auth admin API call with the service-role key. */
export async function authAdmin<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_}/auth/v1/admin/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Auth request failed (${r.status})`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Letters and digits that can't be confused when read aloud or copied (no 0/O, 1/l/I). */
export const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** A random temporary password from a cryptographic source. */
export function temporaryPassword(length = 16): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

/** The checks every admin route makes first. Returns the admin, or a response to send back. */
export async function requireAdmin(
  request: Request,
): Promise<{ admin: { id: string } } | { response: NextResponse }> {
  if (!isConfigured()) return { response: reply({ error: "Not configured." }, 503) };
  const token = bearer(request);
  const user = token ? await userFromToken(token) : null;
  if (!token || !user) return { response: reply({ error: "Please log in again." }, 401) };
  if (!(await callerIsAdmin(token))) return { response: reply({ error: "Admins only." }, 403) };
  return { admin: { id: user.id } };
}
