"use client";

import { useSyncExternalStore } from "react";
import { AUTH_EVENT, getSession } from "@/lib/auth-client";
import { markNotificationsRead, myNotifications, type Notification } from "./api";

// The latest notifications for the bell and the notifications page, refreshed
// every minute while a page is open, when the tab comes back into view and
// on sign-in. Only for the signed-in user (the database filters them).
let current: Notification[] | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function refreshNotifications() {
  if (!getSession()?.access_token) {
    current = null;
    emit();
    return;
  }
  try {
    current = await myNotifications(20);
  } catch {
    // Keep the last list: a failed refresh shouldn't empty the bell.
  }
  emit();
}

/** Marks them read in the database, then here (all when no ids are given). */
export async function markRead(ids?: number[]) {
  await markNotificationsRead(ids);
  const at = new Date().toISOString();
  current =
    current?.map((n) => ((!ids || ids.includes(n.id)) && !n.read_at ? { ...n, read_at: at } : n)) ??
    null;
  emit();
}

let stop: (() => void) | null = null;
function start() {
  void refreshNotifications();
  const timer = window.setInterval(() => void refreshNotifications(), 60_000);
  const onShow = () => document.visibilityState === "visible" && void refreshNotifications();
  const onAuth = () => void refreshNotifications();
  document.addEventListener("visibilitychange", onShow);
  window.addEventListener(AUTH_EVENT, onAuth);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onShow);
    window.removeEventListener(AUTH_EVENT, onAuth);
  };
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  stop ??= start();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && stop) {
      stop();
      stop = null;
    }
  };
};

/** The latest 20 notifications, or null before they load or when signed out. */
export function useNotifications(): Notification[] | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
