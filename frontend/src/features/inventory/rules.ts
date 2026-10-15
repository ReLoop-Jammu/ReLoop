import { BUSINESS_RULES } from "@/config/business-rules";
import type { Handover, Item } from "./model";
import { cutPrice } from "./pricing";

const DAY = 86_400_000;
const HOUR = 3_600_000;

export function daysBetween(fromIso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(fromIso).getTime()) / DAY);
}

/**
 * Business Plan v2's unsold-stock rules, as a pure function so they can be
 * tested. Both count from the listing date and never repeat:
 * - a ReLoop-owned part unsold for 30 days gets one 25% cut (rounded to ₹10);
 * - an A or B device unsold for 45 days becomes C and is stripped for parts.
 * A part listed by a partner shop is not cut (the shop is reminded instead) and
 * a reserved item is skipped. Returns only the items that changed.
 */
export function applyStockRules(items: readonly Item[], now: Date): Item[] {
  const at = now.toISOString();
  const changed: Item[] = [];
  for (const item of items) {
    if (item.status !== "listed" || !item.listedAt || item.hidden) continue;
    const days = daysBetween(item.listedAt, now);
    if (
      item.category !== "part" &&
      days >= BUSINESS_RULES.deviceToC.afterDays &&
      (item.grade === "A" || item.grade === "B")
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
            note: `Unsold for ${days} days: moved to C to be stripped for parts`,
          },
        ],
      });
    } else if (
      item.category === "part" &&
      !item.listedByPartnerId &&
      days >= BUSINESS_RULES.partPriceCut.afterDays &&
      !item.priceCutAt &&
      item.currentPaise
    ) {
      const next = cutPrice(item.currentPaise);
      changed.push({
        ...item,
        currentPaise: next,
        priceCutAt: at,
        events: [
          ...item.events,
          {
            at,
            type: "auto_price_cut",
            note: `Unsold for ${days} days: price cut ${BUSINESS_RULES.partPriceCut.share * 100}%`,
          },
        ],
      });
    }
  }
  return changed;
}

export type Alert = {
  key: "ungraded" | "unlisted" | "scrap_cage" | "batteries" | "price_cut_soon" | "consider_scrap";
  level: "warn" | "act";
  message: string;
  itemIds?: string[];
};

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
      key: "ungraded",
      level: "act",
      message: `${ungraded.length} item(s) not tested within 24 hours`,
      itemIds: ungraded.map((i) => i.id),
    });

  const unlisted = items.filter(
    (i) =>
      i.status === "graded" &&
      (i.category === "part" || i.grade === "A" || i.grade === "B") &&
      i.gradedAt &&
      t - new Date(i.gradedAt).getTime() > BUSINESS_RULES.listWithinHours * HOUR,
  );
  if (unlisted.length)
    alerts.push({
      key: "unlisted",
      level: "act",
      message: `${unlisted.length} part(s) or A/B device(s) not listed within 48 hours`,
      itemIds: unlisted.map((i) => i.id),
    });

  const cage = items.filter((i) => i.status === "in_scrap_cage");
  const cageKg = cage.reduce((s, i) => s + (i.weightKg ?? 0), 0);
  const lastHandover = [...handovers].sort((a, b) => b.date.localeCompare(a.date))[0];
  const daysSinceHandover = lastHandover ? daysBetween(lastHandover.date, now) : Infinity;
  if (
    cage.length &&
    (cageKg >= BUSINESS_RULES.bins.handoverKg ||
      daysSinceHandover >= BUSINESS_RULES.bins.handoverDays)
  ) {
    alerts.push({
      key: "scrap_cage",
      level: "act",
      message: `The D devices bin holds ${cageKg.toFixed(1)} kg${Number.isFinite(daysSinceHandover) ? `, ${daysSinceHandover} days since last handover` : ""}: hand it to VRRG Group`,
      itemIds: cage.map((i) => i.id),
    });
  }

  const batteries = cage.filter((i) => i.hasBattery);
  const lastBattery = [...handovers]
    .filter((h) => h.batteryKg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (
    batteries.length &&
    (!lastBattery || daysBetween(lastBattery.date, now) >= BUSINESS_RULES.bins.batteryHandoverDays)
  ) {
    alerts.push({
      key: "batteries",
      level: "act",
      message: `${batteries.length} item(s) with batteries waiting: batteries go out every week`,
      itemIds: batteries.map((i) => i.id),
    });
  }

  const dueForCut = items.filter(
    (i) =>
      i.status === "listed" &&
      i.category === "part" &&
      !i.listedByPartnerId &&
      i.listedAt &&
      !i.priceCutAt &&
      daysBetween(i.listedAt, now) >= BUSINESS_RULES.partPriceCut.afterDays - 7,
  );
  if (dueForCut.length)
    alerts.push({
      key: "price_cut_soon",
      level: "warn",
      message: `${dueForCut.length} part(s) reach the ${BUSINESS_RULES.partPriceCut.afterDays}-day price cut within a week: feature them on Instagram`,
      itemIds: dueForCut.map((i) => i.id),
    });

  const staleParts = items.filter(
    (i) =>
      i.status === "listed" &&
      i.category === "part" &&
      i.listedAt &&
      daysBetween(i.listedAt, now) >= BUSINESS_RULES.partScrapAlertDays,
  );
  if (staleParts.length)
    alerts.push({
      key: "consider_scrap",
      level: "warn",
      message: `${staleParts.length} part(s) unsold for ${BUSINESS_RULES.partScrapAlertDays} days: consider scrap`,
      itemIds: staleParts.map((i) => i.id),
    });

  return alerts;
}

/**
 * Listed items the daily stock rules will reach within `withinDays`: the day-30
 * price cut on a part and the day-45 move of an A/B device to C. Lets staff
 * promote or re-price them first. Mirrors applyStockRules' conditions.
 */
export function stockRulesDue(
  items: readonly Item[],
  now: Date,
  withinDays = 7,
): { priceCut: string[]; downgrade: string[] } {
  const priceCut: string[] = [];
  const downgrade: string[] = [];
  for (const item of items) {
    if (item.status !== "listed" || !item.listedAt || item.hidden) continue;
    const days = daysBetween(item.listedAt, now);
    const toDowngrade = BUSINESS_RULES.deviceToC.afterDays - days;
    const toCut = BUSINESS_RULES.partPriceCut.afterDays - days;
    if (
      item.category !== "part" &&
      (item.grade === "A" || item.grade === "B") &&
      toDowngrade > 0 &&
      toDowngrade <= withinDays
    )
      downgrade.push(item.id);
    else if (
      item.category === "part" &&
      !item.listedByPartnerId &&
      toCut > 0 &&
      toCut <= withinDays &&
      !item.priceCutAt &&
      item.currentPaise
    )
      priceCut.push(item.id);
  }
  return { priceCut, downgrade };
}
