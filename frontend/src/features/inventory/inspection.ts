import { CHECKLISTS } from "@/features/hub/checklists";
import type { Category, PartType } from "./model";

/** One check's result: it works, it doesn't, or the check doesn't apply to this item. */
export type CheckResult = "pass" | "fail" | "na";

/**
 * The ReLoop Checked record for an item (stored as items.inspection, version
 * 1). Faults and notes are kept elsewhere: this record is public once listed.
 */
export type Inspection = {
  version: 1;
  checks: Record<string, CheckResult>;
  batteryHealthPct?: number;
  storageHealthPct?: number;
  /** Converted from the old tick-box checklist (items graded before inspections). */
  fromChecklist?: boolean;
};

export const INSPECTION_VERSION = 1 as const;

/** The health readings measured for an item: battery for devices with one, storage for drives and computers. */
export function measuresFor(category: Category, partType?: PartType | null) {
  return {
    battery: ["phone", "laptop", "ups"].includes(category) || partType === "battery",
    storage: ["laptop", "desktop"].includes(category) || partType === "storage",
  };
}

/** Every check of the category, all passing: what grade A means (see CHECKLISTS). */
export function allPass(category: Category): Inspection {
  return {
    version: INSPECTION_VERSION,
    checks: Object.fromEntries(CHECKLISTS[category].map((c) => [c, "pass" as const])),
  };
}

/** Why an inspection can't be saved yet, or null when it's complete. */
export function inspectionProblem(category: Category, i: Inspection): string | null {
  const missing = CHECKLISTS[category].filter((c) => !i.checks[c]);
  if (missing.length) return `Record a result for: ${missing.join(", ")}.`;
  for (const [label, v] of [
    ["Battery health", i.batteryHealthPct],
    ["Storage health", i.storageHealthPct],
  ] as const)
    if (v !== undefined && (!Number.isFinite(v) || v < 0 || v > 100))
      return `${label} is a percentage from 0 to 100.`;
  return null;
}

/** The old tick-box checklist, kept in step for older readers (pass = ticked). */
export const checklistOf = (i: Inspection): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(i.checks)
      .filter(([, r]) => r !== "na")
      .map(([k, r]) => [k, r === "pass"]),
  );

/** Database JSON (snake_case) to the app's shape, and back. Unknown shapes read as no inspection. */
export function inspectionFromRow(raw: unknown): Inspection | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "number" || !r.checks || typeof r.checks !== "object") return undefined;
  const checks: Record<string, CheckResult> = {};
  for (const [k, v] of Object.entries(r.checks as Record<string, unknown>))
    if (v === "pass" || v === "fail" || v === "na") checks[k] = v;
  return {
    version: INSPECTION_VERSION,
    checks,
    ...(typeof r.battery_health_pct === "number" && { batteryHealthPct: r.battery_health_pct }),
    ...(typeof r.storage_health_pct === "number" && { storageHealthPct: r.storage_health_pct }),
    ...(r.from_checklist === true && { fromChecklist: true }),
  };
}

export function inspectionToRow(i: Inspection | undefined) {
  if (!i) return null;
  return {
    version: i.version,
    checks: i.checks,
    ...(i.batteryHealthPct !== undefined && { battery_health_pct: i.batteryHealthPct }),
    ...(i.storageHealthPct !== undefined && { storage_health_pct: i.storageHealthPct }),
    ...(i.fromChecklist && { from_checklist: true }),
  };
}
