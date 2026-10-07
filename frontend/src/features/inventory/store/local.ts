/*
 * Browser-storage adapter. Data lives ONLY in this browser on this device:
 * fine for the single hub laptop during the pilot, not shared with buyers or
 * other staff. Replace with a Supabase adapter exposing the same functions.
 */

const PREFIX = "reloop:v1:";
const memory = new Map<string, unknown>();

export class StorageFullError extends Error {
  constructor() {
    super(
      "This device's storage is full. Export a backup and remove old photos, or move to the shared database.",
    );
  }
}

export function readCollection<T>(name: string): T[] {
  const key = PREFIX + name;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T[];
  } catch {
    // Private mode or corrupted value: fall back to memory.
  }
  return (memory.get(key) as T[] | undefined) ?? [];
}

export function writeCollection<T>(name: string, rows: T[]): void {
  const key = PREFIX + name;
  memory.set(key, rows);
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch (err) {
    if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22))
      throw new StorageFullError();
    // Storage unavailable (private mode): keep the in-memory copy for this session.
  }
}

export function storageUsageBytes(): number {
  try {
    let total = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) total += (window.localStorage.getItem(k)?.length ?? 0) * 2;
    }
    return total;
  } catch {
    return 0;
  }
}
