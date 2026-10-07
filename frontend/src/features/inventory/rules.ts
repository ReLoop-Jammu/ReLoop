import { BUSINESS_RULES } from "@/config/business-rules";
import type { Handover, Item } from "./model";
import { cutPrice } from "./pricing";

const DAY = 86_400_000;
const HOUR = 3_600_000;

export function daysBetween(fromIso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(fromIso).getTime()) / DAY);
}

/**
 * The plan's unsold-stock rules, as a pure function so they can be tested:
 * day 45 after listing → price cut 20% (once); day 75 → downgraded to C and
 * sent for stripping. Returns only the items that changed.
 */
export function applyStockRules(items: readonly Item[], now: Date): Item[] {
  const at = now.toISOString();
  const changed: Item[] = [];
  for (const item of items) {
    if (item.status !== "listed" || !item.listedAt) continue;
    const days = daysBetween(item.listedAt, now);
    if (
      days >= BUSINESS_RULES.downgradeToC.afterDays &&
      item.grade !== "C" &&
      item.category !== "part"
    ) {
      changed.push({
        ...item,
        grade: "C",
        status: "stripping",
        events: [
          ...item.events,
          {
            at,
            type: "auto_downgrade",
            note: `Unsold for ${days} days: downgraded to C for parts`,
          },
        ],
      });
    } else if (days >= BUSINESS_RULES.priceCut.afterDays && !item.priceCutAt && item.currentPaise) {
      const next = cutPrice(item.currentPaise);
      changed.push({
        ...item,
        currentPaise: next,
        priceCutAt: at,
        events: [
          ...item.events,
          { at, type: "auto_price_cut", note: `Unsold for ${days} days: price cut 20%` },
        ],
      });
    }
  }
  return changed;
}

export type Alert = { level: "warn" | "act"; message: string; itemIds?: string[] };

/** Service-level reminders from the plan. Shown to staff, never applied automatically. */
export function hubAlerts(
  items: readonly Item[],
  handovers: readonly Handover[],
  now: Date,
): Alert[] {
  const alerts: Alert[] = [];
  const t = now.getTime();

  const ungraded = items.filter(
    (i) =>
      i.status === "received" &&
      t - new Date(i.receivedAt).getTime() > BUSINESS_RULES.gradeWithinHours * HOUR,
  );
  if (ungraded.length)
    alerts.push({
      level: "act",
      message: `${ungraded.length} item(s) not graded within 24 hours`,
      itemIds: ungraded.map((i) => i.id),
    });

  const unlisted = items.filter(
    (i) =>
      i.status === "graded" &&
      (i.grade === "A" || i.grade === "B") &&
      i.gradedAt &&
      t - new Date(i.gradedAt).getTime() > BUSINESS_RULES.listWithinHours * HOUR,
  );
  if (unlisted.length)
    alerts.push({
      level: "act",
      message: `${unlisted.length} A/B item(s) not listed within 48 hours`,
      itemIds: unlisted.map((i) => i.id),
    });

  const cage = items.filter((i) => i.status === "in_scrap_cage");
  const cageKg = cage.reduce((s, i) => s + (i.weightKg ?? 0), 0);
  const lastHandover = [...handovers].sort((a, b) => b.date.localeCompare(a.date))[0];
  const daysSinceHandover = lastHandover ? daysBetween(lastHandover.date, now) : Infinity;
  if (
    cage.length &&
    (cageKg >= BUSINESS_RULES.scrapHandover.kgTrigger ||
      daysSinceHandover >= BUSINESS_RULES.scrapHandover.daysTrigger)
  ) {
    alerts.push({
      level: "act",
      message: `Scrap cage holds ${cageKg.toFixed(1)} kg${Number.isFinite(daysSinceHandover) ? `, ${daysSinceHandover} days since last handover` : ""}: book a recycler pickup`,
      itemIds: cage.map((i) => i.id),
    });
  }

  const batteries = cage.filter((i) => i.hasBattery);
  const lastBattery = [...handovers]
    .filter((h) => h.batteryKg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (
    batteries.length &&
    (!lastBattery || daysBetween(lastBattery.date, now) >= BUSINESS_RULES.batteryHandoverDays)
  ) {
    alerts.push({
      level: "act",
      message: `${batteries.length} item(s) with batteries waiting: batteries go out every week`,
      itemIds: batteries.map((i) => i.id),
    });
  }

  const dueForCut = items.filter(
    (i) =>
      i.status === "listed" &&
      i.listedAt &&
      !i.priceCutAt &&
      daysBetween(i.listedAt, now) >= BUSINESS_RULES.priceCut.afterDays - 7,
  );
  if (dueForCut.length)
    alerts.push({
      level: "warn",
      message: `${dueForCut.length} listing(s) reach the 45-day price cut within a week: feature them on Instagram`,
      itemIds: dueForCut.map((i) => i.id),
    });

  return alerts;
}
