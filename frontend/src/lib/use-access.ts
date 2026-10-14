"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getSession, myAccess, type Access } from "@/lib/auth-client";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const signedIn = () => Boolean(getSession()?.access_token);

// One access lookup per page load, shared by every component that asks.
let pending: Promise<Access | null> | null = null;
const lookup = () => (pending ??= myAccess().catch(() => null));

export type AccessState =
  { state: "signed-out" } | { state: "loading" } | { state: "ready"; access: Access | null };

/** Who is signed in and what they may see (menus only: the database enforces every permission). */
export function useAccess(): AccessState {
  const isIn = useSyncExternalStore(subscribe, signedIn, () => false);
  const [access, setAccess] = useState<Access | null | undefined>(undefined);
  useEffect(() => {
    if (!isIn) return;
    let alive = true;
    lookup().then((a) => alive && setAccess(a));
    return () => {
      alive = false;
    };
  }, [isIn]);
  if (!isIn) return { state: "signed-out" };
  if (access === undefined) return { state: "loading" };
  return { state: "ready", access };
}

export const roleLabel = (a: Access | null) =>
  a?.is_admin
    ? "Admin"
    : a?.is_staff
      ? "Hub staff"
      : a?.role === "shop_owner"
        ? "Partner shop"
        : "Buyer";
