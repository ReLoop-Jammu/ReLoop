import { BUSINESS_RULES } from "@/config/business-rules";
import type { Capacity } from "./api";

export type BinView = {
  bin: string;
  kg: number;
  fillPct: number;
  level: "ok" | "alert" | "due";
  daysWaiting: number;
};

/** Each bin against the 100 kg handover limit: alert from 80 kg, due at 100 kg or 14 days (batteries: 7). */
export function binViews(c: Capacity): BinView[] {
  return c.bins.map((b) => {
    const kg = Number(b.kg);
    return {
      bin: b.bin,
      kg,
      fillPct: Math.min(100, Math.round((kg / BUSINESS_RULES.bins.handoverKg) * 100)),
      level: b.due ? "due" : b.near_limit ? "alert" : "ok",
      daysWaiting: b.days_waiting,
    };
  });
}

/** Things the hub should act on, as short sentences (empty when all is well). */
export function capacityAlerts(c: Capacity): string[] {
  const out: string[] = [];
  for (const b of binViews(c))
    if (b.level === "due")
      out.push(`The ${b.bin.replace("_", " ")} bin is due for handover to VRRG Group.`);
    else if (b.level === "alert")
      out.push(
        `The ${b.bin.replace("_", " ")} bin is at ${b.kg} kg, close to the ${BUSINESS_RULES.bins.handoverKg} kg handover.`,
      );
  if (c.battery.reminder)
    out.push(
      "The battery cabinet has not been handed over for a week: book the weekly battery handover.",
    );
  const r = c.device_rack;
  if (r.slots && r.alert)
    out.push(`The device racks are ${r.pct}% full (${r.used} of ${r.slots} slots).`);
  return out;
}

export const conditionLabel = (c: string | null) =>
  ({ good: "Good", used: "Used", swollen: "Swollen", damaged: "Damaged" })[c ?? ""] ??
  "Not recorded";
