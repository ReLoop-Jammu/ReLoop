"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AUTH_EVENT, authVersion, getSession, myAccess, type Access } from "@/lib/auth-client";

// One access lookup per signed-in user and auth change, shared by every
// component that asks. A failed lookup isn't kept, so the next render retries.
let pending: { key: string; result: Promise<Access | null> } | null = null;
const lookup = (key: string) => {
  if (pending?.key !== key) {
    const result = myAccess().catch(() => null);
    pending = { key, result };
    void result.then((a) => {
      if (a === null && pending?.key === key) pending = null;
    });
  }
  return pending.result;
};

// Re-render on sign-in, sign-out and password changes, in this tab (AUTH_EVENT) and in others ("storage").
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_EVENT, onChange);
  };
};
/** "<user id>:<auth version>" while signed in, null when signed out. */
const currentKey = () => {
  const session = getSession();
  return session?.access_token ? `${session.user.id}:${authVersion()}` : null;
};

export type AccessState =
  { state: "signed-out" } | { state: "loading" } | { state: "ready"; access: Access | null };

/** Who is signed in and what they may see (menus only: the database enforces every permission). */
export function useAccess(): AccessState {
  const key = useSyncExternalStore(subscribe, currentKey, () => null);
  const [loaded, setLoaded] = useState<{ key: string; access: Access | null } | null>(null);
  useEffect(() => {
    if (key === null) return;
    let alive = true;
    lookup(key).then((access) => alive && setLoaded({ key, access }));
    return () => {
      alive = false;
    };
  }, [key]);
  if (key === null) return { state: "signed-out" };
  if (loaded?.key !== key) return { state: "loading" };
  return { state: "ready", access: loaded.access };
}

export const roleLabel = (a: Access | null) =>
  a?.must_change_password
    ? "Password change needed"
    : a?.is_admin
      ? "Admin"
      : a?.is_staff
        ? "Hub staff"
        : a?.role === "shop_owner"
          ? "Partner shop"
          : "Buyer";
