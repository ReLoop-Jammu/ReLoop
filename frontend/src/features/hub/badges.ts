"use client";

import { useSyncExternalStore } from "react";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { AUTH_EVENT, authenticatedFetch, getSession } from "@/lib/auth-client";
import type { HubBadges } from "./tools";

/** Asks the database what is waiting (hub staff only). */
export async function fetchHubBadges(): Promise<HubBadges> {
  const r = await authenticatedFetch("/rest/v1/rpc/hub_badges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!r.ok) throw new Error("Could not load the hub's queues.");
  return (await r.json()) as HubBadges;
}

// One shared copy for the menu and the overview, refreshed every minute while
// a hub page is open and whenever the tab comes back into view.
let current: HubBadges | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Fetches the badges again now (after a change on this page, for example). */
export async function refreshHubBadges() {
  if (!SHARED_DATABASE || !getSession()?.access_token) {
    current = null;
    emit();
    return;
  }
  try {
    current = await fetchHubBadges();
  } catch {
    current = null;
  }
  emit();
}

let stop: (() => void) | null = null;
function start() {
  void refreshHubBadges();
  const timer = window.setInterval(() => void refreshHubBadges(), 60_000);
  const onShow = () => document.visibilityState === "visible" && void refreshHubBadges();
  const onAuth = () => void refreshHubBadges();
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
  if (SHARED_DATABASE && !stop) stop = start();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && stop) {
      stop();
      stop = null;
    }
  };
};

/** The latest counts, or null without the shared database, before they load, or when not allowed. */
export function useHubBadges(): HubBadges | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
