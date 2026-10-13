"use client";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_KEY = "reloop-auth-session";

export type ReLoopRole = "buyer" | "shop_owner";
export type AuthSession = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string } };

function config() {
  if (!URL || !KEY) throw new Error("Authentication is not configured. Please contact ReLoop.");
  return { base: URL.replace(/\/$/, ""), key: KEY };
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch { return null; }
}

export function saveSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(STORAGE_KEY);
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const { base, key } = config();
  const response = await fetch(`${base}/auth/v1/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.msg === "string" ? data.msg : typeof data.message === "string" ? data.message : typeof data.error_description === "string" ? data.error_description : "Authentication failed. Check your details and try again.";
    throw new Error(message);
  }
  return data;
}

export async function registerAccount(input: { email: string; password: string; fullName: string; phone: string; role: ReLoopRole; shopName?: string; gstin?: string; businessAddress?: string }) {
  const data = await authRequest("signup", {
    email: input.email.trim().toLowerCase(), password: input.password,
    data: { full_name: input.fullName.trim(), phone: input.phone.trim(), account_type: input.role,
      shop_name: input.shopName?.trim() ?? "", gstin: input.gstin?.trim().toUpperCase() ?? "", business_address: input.businessAddress?.trim() ?? "" },
  });
  if (data.access_token && data.refresh_token && data.user) saveSession(data as unknown as AuthSession);
  return { session: Boolean(data.access_token), message: data.access_token ? "Account created successfully." : "Account created. Check your email to confirm your address, then log in." };
}

export async function loginAccount(email: string, password: string) {
  const data = await authRequest("token?grant_type=password", { email: email.trim().toLowerCase(), password });
  if (!data.access_token || !data.refresh_token || !data.user) throw new Error("Login succeeded but no session was returned. Check email confirmation settings.");
  const session = data as unknown as AuthSession;
  if (typeof data.expires_in === "number") session.expires_at = Math.floor(Date.now() / 1000) + data.expires_in;
  saveSession(session);
  return session;
}

export async function logoutAccount() {
  const session = getSession();
  if (session?.access_token) {
    const { base, key } = config();
    await fetch(`${base}/auth/v1/logout`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
  }
  saveSession(null);
}

export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const session = getSession();
  if (!session?.access_token) throw new Error("Please log in to continue.");
  const { base, key } = config();
  return fetch(`${base}${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, ...(init.headers ?? {}) }, cache: "no-store" });
}
