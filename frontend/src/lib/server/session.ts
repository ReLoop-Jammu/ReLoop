import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { supabaseConfig } from "./config";

/*
 * Sessions live in HttpOnly cookies set by our own /api/auth routes, so page
 * scripts (and any XSS) can never read the tokens. The browser only ever asks
 * "who am I?" through /api/auth/session.
 */

export const ACCESS_COOKIE = "rl_at";
export const REFRESH_COOKIE = "rl_rt";

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };
export type SessionUser = { id: string; email: string | null };
export type ActiveSession = { user: SessionUser; accessToken: string; refreshed: Tokens | null };

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
};

export function parseTokenResponse(data: TokenResponse): { tokens: Tokens; user: SessionUser } | null {
  if (!data.access_token || !data.refresh_token || !data.user?.id) return null;
  return {
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
    },
    user: { id: data.user.id, email: data.user.email ?? null },
  };
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function applySessionCookies(response: NextResponse, tokens: Tokens): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...cookieBase, maxAge: tokens.expiresIn });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...cookieBase, maxAge: REFRESH_MAX_AGE });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieBase, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

/** Asks Supabase Auth who owns an access token. Null if it is invalid or expired. */
export async function fetchUser(accessToken: string): Promise<SessionUser | null> {
  const config = supabaseConfig();
  const key = config?.publishableKey ?? config?.serviceKey;
  if (!config || !key) return null;

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const user = (await response.json()) as { id?: string; email?: string };
    return user.id ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}

async function refresh(refreshToken: string) {
  const config = supabaseConfig();
  if (!config?.publishableKey) return null;

  try {
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return parseTokenResponse((await response.json()) as TokenResponse);
  } catch {
    return null;
  }
}

/**
 * The signed-in user for an API request. Uses the access cookie; if it has
 * expired, silently swaps the refresh cookie for a new pair. The caller must
 * apply `refreshed` to its response with applySessionCookies.
 */
export async function getActiveSession(request: NextRequest): Promise<ActiveSession | null> {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (access) {
    const user = await fetchUser(access);
    if (user) return { user, accessToken: access, refreshed: null };
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const next = await refresh(refreshToken);
  if (!next) return null;
  return { user: next.user, accessToken: next.tokens.accessToken, refreshed: next.tokens };
}

/** Calls Supabase's REST API as the signed-in user (Row Level Security applies). */
export async function userRest<T>(accessToken: string, path: string): Promise<T | null> {
  const config = supabaseConfig();
  const key = config?.publishableKey ?? config?.serviceKey;
  if (!config || !key) return null;

  try {
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}
