"use client";

/*
 * Browser side of authentication. Sessions are HttpOnly cookies managed by the
 * /api/auth routes, so this file never sees or stores a token.
 */

export type ReLoopRole = "buyer" | "shop_owner";

export type Account = {
  user: { id: string; email: string | null };
  profile: { full_name: string; role: ReLoopRole } | null;
  shop: {
    shop_name: string;
    gstin: string | null;
    verification_status: "pending" | "verified" | "rejected";
  } | null;
  isStaff: boolean;
};

async function post<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not connect to ReLoop. Check your internet connection and try again.");
  }

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

export type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: ReLoopRole;
  shopName?: string;
  gstin?: string;
  businessAddress?: string;
  /** Honeypot: real visitors leave it empty. */
  website?: string;
};

export function registerAccount(input: RegisterInput) {
  return post<{ session: boolean; message: string }>("/api/auth/register", input);
}

export async function loginAccount(email: string, password: string): Promise<void> {
  await post("/api/auth/login", { email, password });
}

export async function logoutAccount(): Promise<void> {
  try {
    await post("/api/auth/logout");
  } catch {
    // Nothing to do: the server clears the cookies when it can be reached.
  }
}

/** The signed-in account, or null. Also renews an expired session. */
export async function fetchAccount(): Promise<Account | null> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { authenticated: boolean } & Partial<Account>;
    if (!data.authenticated || !data.user) return null;
    return {
      user: data.user,
      profile: data.profile ?? null,
      shop: data.shop ?? null,
      isStaff: Boolean(data.isStaff),
    };
  } catch {
    return null;
  }
}
