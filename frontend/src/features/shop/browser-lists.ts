"use client";

import { useSyncExternalStore } from "react";

/**
 * Small lists kept in this browser only (compare and recently viewed): never
 * sent anywhere. Storage can be unavailable (private mode, blocked), so every
 * read and write is guarded and the lists just come back empty.
 */
export type SavedItem = { id: string; title: string; pricePaise: number; grade: string };

const EVENT = "reloop:shop-lists";
const KEYS = { compare: "reloop-compare", viewed: "reloop-recently-viewed" } as const;
export const COMPARE_MAX = 3;
const VIEWED_MAX = 8;
type List = keyof typeof KEYS;

// One snapshot per list, so useSyncExternalStore sees a stable value until it changes.
const cache: Partial<Record<List, { raw: string | null; value: SavedItem[] }>> = {};

function read(list: List): SavedItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEYS[list]);
  } catch {
    raw = null;
  }
  const hit = cache[list];
  if (hit && hit.raw === raw) return hit.value;
  let value: SavedItem[] = [];
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed))
      value = parsed.filter(
        (x): x is SavedItem =>
          !!x &&
          typeof x === "object" &&
          typeof (x as SavedItem).id === "string" &&
          /^RL-[A-Z]{3}-\d{4,}$/.test((x as SavedItem).id),
      );
  } catch {
    value = [];
  }
  cache[list] = { raw, value };
  return value;
}

function write(list: List, items: SavedItem[]) {
  try {
    window.localStorage.setItem(KEYS[list], JSON.stringify(items));
  } catch {
    // Storage blocked: the list stays as it was.
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};
const EMPTY: SavedItem[] = [];

export function useShopList(list: List): SavedItem[] {
  return useSyncExternalStore(
    subscribe,
    () => read(list),
    () => EMPTY,
  );
}

/** Adds or removes an item to compare; at most three. Returns false when the list is full. */
export function toggleCompare(item: SavedItem): boolean {
  const now = read("compare");
  if (now.some((i) => i.id === item.id)) {
    write(
      "compare",
      now.filter((i) => i.id !== item.id),
    );
    return true;
  }
  if (now.length >= COMPARE_MAX) return false;
  write("compare", [...now, item]);
  return true;
}
export const clearCompare = () => write("compare", []);

/** Remembers an item page visit, newest first. */
export function rememberViewed(item: SavedItem) {
  write("viewed", [item, ...read("viewed").filter((i) => i.id !== item.id)].slice(0, VIEWED_MAX));
}

export const compareHref = (items: readonly SavedItem[]) =>
  `/shop/compare?ids=${items.map((i) => i.id).join(",")}`;
