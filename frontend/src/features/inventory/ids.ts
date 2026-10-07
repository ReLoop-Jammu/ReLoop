import { BUSINESS_RULES } from "@/config/business-rules";

const ID_PATTERN = /^RL-([A-Z]{3})-(\d{4,})$/;

/** Formats a tag like RL-JMU-0001. Numbers grow past 4 digits if ever needed. */
export function formatItemId(n: number, hub: string = BUSINESS_RULES.hubCode): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid item number: ${n}`);
  return `RL-${hub}-${String(n).padStart(4, "0")}`;
}

export function parseItemNumber(id: string): number | null {
  const m = ID_PATTERN.exec(id);
  return m ? Number(m[2]) : null;
}

export function isItemId(value: string): boolean {
  return ID_PATTERN.test(value);
}

/** Next free tag after the highest existing one, so imports never collide. */
export function nextItemId(
  existingIds: Iterable<string>,
  hub: string = BUSINESS_RULES.hubCode,
): string {
  let max = 0;
  for (const id of existingIds) max = Math.max(max, parseItemNumber(id) ?? 0);
  return formatItemId(max + 1, hub);
}

/** Short random id for non-item records (partners, handovers…). */
export function randomId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}
