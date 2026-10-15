"use client";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_KEY = "reloop-auth-session";

export type ReLoopRole = "buyer" | "shop_owner";
export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email?: string };
};

function config() {
  if (!URL || !KEY) throw new Error("Authentication is not configured. Please contact ReLoop.");
  return { base: URL.replace(/\/$/, ""), key: KEY };
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

/** Fired in this tab when the signed-in user or what they may do changes. */
export const AUTH_EVENT = "reloop:auth";

let accessVersion = 0;
/** Goes up on every sign-in, sign-out and password change, so menus look up access again. */
export const authVersion = () => accessVersion;

/** Tells this tab's menus that the user's access may have changed. */
export function accessChanged() {
  if (typeof window === "undefined") return;
  accessVersion++;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function saveSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  const before = Boolean(getSession()?.access_token);
  if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(STORAGE_KEY);
  // "storage" events reach only other tabs; tell this tab's menus too when
  // someone signs in or out (not on every token refresh).
  if (before !== Boolean(session?.access_token)) accessChanged();
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const { base, key } = config();
  const response = await fetch(`${base}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof data.msg === "string"
        ? data.msg
        : typeof data.message === "string"
          ? data.message
          : typeof data.error_description === "string"
            ? data.error_description
            : "Authentication failed. Check your details and try again.";
    throw new Error(message);
  }
  return data;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: ReLoopRole;
  shopName?: string;
  gstin?: string;
  businessAddress?: string;
}) {
  const data = await authRequest("signup", {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    data: {
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      account_type: input.role,
      shop_name: input.shopName?.trim() ?? "",
      gstin: input.gstin?.trim().toUpperCase() ?? "",
      business_address: input.businessAddress?.trim() ?? "",
    },
  });
  if (data.access_token && data.refresh_token && data.user)
    saveSession(data as unknown as AuthSession);
  return {
    session: Boolean(data.access_token),
    message: data.access_token
      ? "Account created successfully."
      : "Account created. Check your email to confirm your address, then log in.",
  };
}

export async function loginAccount(email: string, password: string) {
  const data = await authRequest("token?grant_type=password", {
    email: email.trim().toLowerCase(),
    password,
  });
  if (!data.access_token || !data.refresh_token || !data.user)
    throw new Error(
      "Login succeeded but no session was returned. Check email confirmation settings.",
    );
  const session = data as unknown as AuthSession;
  if (typeof data.expires_in === "number")
    session.expires_at = Math.floor(Date.now() / 1000) + data.expires_in;
  saveSession(session);
  return session;
}

export async function logoutAccount() {
  const session = getSession();
  if (session?.access_token) {
    const { base, key } = config();
    await fetch(`${base}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
  }
  saveSession(null);
}

/** Access tokens last about an hour; swap the refresh token for a new pair shortly before. */
export function needsRefresh(session: AuthSession, nowSeconds = Date.now() / 1000): boolean {
  return Boolean(session.expires_at && session.expires_at - 60 <= nowSeconds);
}

let refreshing: Promise<AuthSession | null> | null = null;

async function currentSession(): Promise<AuthSession | null> {
  const session = getSession();
  if (!session?.access_token || !needsRefresh(session)) return session;
  // One refresh at a time, even when several requests start together.
  refreshing ??= (async () => {
    try {
      const data = await authRequest("token?grant_type=refresh_token", {
        refresh_token: session.refresh_token,
      });
      if (typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
        throw new Error("No session returned");
      }
      const next: AuthSession = {
        ...session,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        ...(typeof data.expires_in === "number" && {
          expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        }),
      };
      saveSession(next);
      return next;
    } catch {
      saveSession(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const session = await currentSession();
  if (!session?.access_token) throw new Error("Please log in to continue.");
  const { base, key } = config();
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

/**
 * Where to go after logging in: the ?next= page if it is a page on this site,
 * otherwise `fallback`. Other sites, "//host", backslashes, schemes and the
 * login pages themselves are ignored, so the link can't send people elsewhere
 * or loop.
 */
export function safeNext(search: string, fallback = "/account"): string {
  const next = new URLSearchParams(search).get("next") ?? "";
  if (!/^\/(?![/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?]*$/.test(next)) return fallback;
  const base = "https://reloop.invalid";
  // globalThis: this module's own URL constant is the Supabase address.
  let url: globalThis.URL;
  try {
    url = new globalThis.URL(next, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  // Check the resolved path too: "/.//evil.example" resolves to "//evil.example".
  const resolved = url.pathname + url.search;
  if (!/^\/(?![/\\])/.test(resolved)) return fallback;
  if (/^\/(login|register|logout|reset-password)(\/|$)/.test(url.pathname)) return fallback;
  return resolved;
}

/* ---------------------------------------------------------------- account recovery */

const backTo = (path: string) => encodeURIComponent(`${window.location.origin}${path}`);

/**
 * Asks Supabase to email a password-reset link that opens /reset-password.
 * Resolves the same way whether or not the email has an account, so the page
 * never reveals who is registered; only "too many requests" is passed on.
 */
export async function requestPasswordReset(email: string) {
  await neutral(() =>
    authRequest(`recover?redirect_to=${backTo("/reset-password")}`, {
      email: email.trim().toLowerCase(),
    }),
  );
}

/** Asks Supabase to send the sign-up confirmation email again (link opens /login). */
export async function resendConfirmation(email: string) {
  await neutral(() =>
    authRequest(`resend?redirect_to=${backTo("/login")}`, {
      type: "signup",
      email: email.trim().toLowerCase(),
    }),
  );
}

async function neutral(send: () => Promise<unknown>) {
  try {
    await send();
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/rate limit|too many|seconds/i.test(message)) {
      throw new Error("Too many requests. Please wait a minute and try again.");
    }
    if (/not configured/i.test(message)) throw e;
  }
}

export type AuthRedirect =
  | { kind: "recovery"; session: AuthSession }
  | { kind: "error"; message: string }
  | { kind: "none" };

/**
 * Reads what Supabase puts after the # when an email link opens the site:
 * a recovery session, or an error such as an expired link.
 */
export function parseAuthRedirect(hash: string): AuthRedirect {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  if (p.get("error") || p.get("error_code")) {
    const expired = p.get("error_code") === "otp_expired";
    return {
      kind: "error",
      message: expired
        ? "This link has expired or was already used. Ask for a new one."
        : (p.get("error_description") ?? "This link didn't work. Ask for a new one."),
    };
  }
  const access = p.get("access_token");
  const refresh = p.get("refresh_token");
  if (p.get("type") === "recovery" && access && refresh) {
    const expiresIn = Number(p.get("expires_in"));
    return {
      kind: "recovery",
      session: {
        access_token: access,
        refresh_token: refresh,
        ...(Number.isFinite(expiresIn) && expiresIn > 0
          ? { expires_at: Math.floor(Date.now() / 1000) + expiresIn }
          : {}),
        user: { id: "" },
      },
    };
  }
  return { kind: "none" };
}

/** Sets a new password with the session from a reset link, then keeps the user logged in. */
export async function setNewPassword(session: AuthSession, password: string) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("Use a password of 8 to 128 characters.");
  }
  const { base, key } = config();
  const response = await fetch(`${base}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    email?: string;
    msg?: string;
    message?: string;
  };
  if (!response.ok || !data.id) {
    throw new Error(
      data.msg ?? data.message ?? "We couldn't set your password. Ask for a new reset link.",
    );
  }
  saveSession({ ...session, user: { id: data.id, ...(data.email ? { email: data.email } : {}) } });
  accessChanged();
}

/* ---------------------------------------------------------------- temporary passwords */

/** Calls one of this site's own API routes with the signed-in user's session. */
export async function siteFetch(path: string, init: RequestInit = {}) {
  const session = await currentSession();
  if (!session?.access_token) throw new Error("Please log in to continue.");
  return fetch(path, {
    ...init,
    headers: {
      // A file upload sets its own multipart type.
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${session.access_token}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** True when an admin reset this account's password and a new one must be chosen first. */
export async function mustChangePassword(): Promise<boolean> {
  const me = getSession()?.user.id;
  if (!me) return false;
  const response = await authenticatedFetch(
    `/rest/v1/profiles?select=must_change_password&user_id=eq.${me}`,
  );
  if (!response.ok) return false;
  const rows = (await response.json()) as { must_change_password?: boolean }[];
  return rows[0]?.must_change_password === true;
}

/**
 * Sets the signed-in user's new password (and clears a temporary-password
 * flag). The current password is required unless an admin reset it.
 */
export async function changePassword(password: string, currentPassword?: string) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("Use a password of 8 to 128 characters.");
  }
  const response = await siteFetch("/api/account/password", {
    method: "POST",
    body: JSON.stringify({ password, currentPassword }),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Your password wasn't changed.");
  // A forced change ends here, and with it the staff and admin lock-out.
  accessChanged();
}

export const CHANGE_PASSWORD_PATH = "/account/change-password";

/** What the signed-in user may see, from public.my_access() (null when signed out or offline). */
export type Access = {
  user_id: string;
  name: string | null;
  role: "buyer" | "shop_owner" | "admin" | null;
  must_change_password: boolean;
  is_staff: boolean;
  is_admin: boolean;
  shop_status: "pending" | "verified" | "rejected" | null;
};

export async function myAccess(): Promise<Access | null> {
  if (!getSession()) return null;
  const response = await authenticatedFetch("/rest/v1/rpc/my_access", {
    method: "POST",
    // Without the JSON type PostgREST looks for my_access(text) and answers 404.
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) return null;
  return (await response.json()) as Access;
}

/**
 * Where to go after logging in. A page that sent you to log in (?next=) comes
 * first. Otherwise hub staff and admins go to the hub, and everyone else back
 * to the page they logged in from (?from=), or their account.
 */
export function loginDestination(
  search: string,
  access: Pick<Access, "is_staff" | "is_admin"> | null,
): string {
  const params = new URLSearchParams(search);
  if (params.get("next")) {
    const next = safeNext(search, "");
    if (next) return next;
  }
  if (access?.is_staff || access?.is_admin) return "/hub";
  const from = params.get("from");
  return from ? safeNext(`?next=${encodeURIComponent(from)}`) : "/account";
}

/** The login link for a page: it brings you back there afterwards (not for staff, who go to the hub). */
export function loginHref(pathname: string, search = "") {
  const here = pathname + search;
  return here === "/" || /^\/(login|register)(\/|$)/.test(pathname)
    ? "/login"
    : `/login?from=${encodeURIComponent(here)}`;
}
