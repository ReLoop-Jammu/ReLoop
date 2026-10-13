
"use client";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_KEY = "reloop-auth-session";

export type ReLoopRole = "buyer" | "shop_owner";

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
  };
};

type AuthUser = {
  id?: string;
  email?: string;
  identities?: Array<unknown> | null;
};

type AuthResponse = Record<string, unknown> & {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: AuthUser;
};

function config() {
  if (!URL || !KEY) {
    throw new Error(
      "Authentication is not configured. Please contact ReLoop."
    );
  }

  return {
    base: URL.replace(/\/$/, ""),
    key: KEY,
  };
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw) as AuthSession;

    if (
      !session.access_token ||
      !session.refresh_token ||
      !session.user?.id
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (session) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(session)
      );
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    throw new Error(
      "Unable to save your session in this browser. Check your browser storage settings."
    );
  }
}

async function authRequest(
  path: string,
  body: Record<string, unknown>
): Promise<AuthResponse> {
  const { base, key } = config();

  let response: Response;

  try {
    response = await fetch(`${base}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Could not connect to ReLoop authentication. Check your internet connection and try again."
    );
  }

  const data = (await response
    .json()
    .catch(() => ({}))) as AuthResponse;

  if (!response.ok) {
    const message =
      typeof data.msg === "string"
        ? data.msg
        : typeof data.message === "string"
          ? data.message
          : typeof data.error_description === "string"
            ? data.error_description
            : typeof data.error === "string"
              ? data.error
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
  if (input.role !== "buyer" && input.role !== "shop_owner") {
    throw new Error("Invalid account type.");
  }

  const email = input.email.trim().toLowerCase();

  const data = await authRequest("signup", {
    email,
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

  const user = data.user;

  // Do not display success if Supabase returned no user.
  if (!user?.id) {
    throw new Error(
      "Supabase did not return a user ID. The account could not be confirmed as created. Please try again."
    );
  }

  // Supabase may return an empty identities array for an
  // email that is already registered.
  if (
    Array.isArray(user.identities) &&
    user.identities.length === 0
  ) {
    throw new Error(
      "This email may already be registered. Try logging in or use password recovery."
    );
  }

  // If email confirmation is disabled, Supabase normally
  // returns a session immediately.
  if (data.access_token && data.refresh_token) {
    const session: AuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: {
        id: user.id,
        email: user.email ?? email,
      },
      ...(typeof data.expires_in === "number"
        ? {
            expires_at:
              Math.floor(Date.now() / 1000) + data.expires_in,
          }
        : {}),
    };

    saveSession(session);

    return {
      session: true,
      message: "Account created successfully.",
    };
  }

  // Email confirmation may be required before a session
  // is issued. The user must confirm before logging in.
  return {
    session: false,
    message:
      "Your signup was accepted by Supabase. Check your email to confirm your address, then log in. If no confirmation email arrives, check your Supabase Auth settings and logs.",
  };
}

export async function loginAccount(
  email: string,
  password: string
): Promise<AuthSession> {
  const data = await authRequest(
    "token?grant_type=password",
    {
      email: email.trim().toLowerCase(),
      password,
    }
  );

  if (
    !data.access_token ||
    !data.refresh_token ||
    !data.user?.id
  ) {
    throw new Error(
      "Login did not return a complete session. Confirm your email address and check your Supabase Auth settings."
    );
  }

  const session: AuthSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? email.trim().toLowerCase(),
    },
    ...(typeof data.expires_in === "number"
      ? {
          expires_at:
            Math.floor(Date.now() / 1000) + data.expires_in,
        }
      : {}),
  };

  saveSession(session);

  return session;
}

export async function logoutAccount(): Promise<void> {
  const session = getSession();

  try {
    if (session?.access_token) {
      const { base, key } = config();

      await fetch(`${base}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });
    }
  } finally {
    // Clear the local session even if the network request fails.
    saveSession(null);
  }
}

export async function authenticatedFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const session = getSession();

  if (!session?.access_token) {
    throw new Error("Please log in to continue.");
  }

  const { base, key } = config();

  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set(
    "Authorization",
    `Bearer ${session.access_token}`
  );

  return fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
