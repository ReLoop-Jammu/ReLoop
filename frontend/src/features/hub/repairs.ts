import type { Item, Partner, RepairJob } from "@/features/inventory/model";

export type RepairRow = {
  id: string;
  itemId: string;
  itemName: string;
  partnerName: string;
  fault: string;
  feePaise: number;
  sentOn: string;
  daysOut: number;
  outcome?: RepairJob["outcome"];
  overdue: boolean;
};

const DAY = 86_400_000;

/** Repairs out for longer than this are flagged. */
export const REPAIR_OVERDUE_DAYS = 14;

/**
 * The repair board: jobs still out (longest out first), and the last ten that
 * came back. Days out run from the day it was sent to the day it came back,
 * or to today while it is still out.
 */
export function repairBoard(
  jobs: readonly RepairJob[],
  items: readonly Item[],
  partners: readonly Partner[],
  now: Date,
) {
  const row = (j: RepairJob): RepairRow => {
    const end = j.returnedAt ? new Date(j.returnedAt) : now;
    const days = Math.max(0, Math.floor((end.getTime() - new Date(j.sentAt).getTime()) / DAY));
    const item = items.find((i) => i.id === j.itemId);
    return {
      id: j.id,
      itemId: j.itemId,
      itemName: item ? [item.brand, item.model].filter(Boolean).join(" ") || item.category : "",
      partnerName: partners.find((p) => p.id === j.partnerId)?.name ?? "Unknown partner",
      fault: j.fault,
      feePaise: j.feePaise,
      sentOn: new Date(j.sentAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
      }),
      daysOut: days,
      outcome: j.outcome,
      overdue: !j.returnedAt && days > REPAIR_OVERDUE_DAYS,
    };
  };
  const open = jobs
    .filter((j) => !j.returnedAt)
    .map(row)
    .sort((a, b) => b.daysOut - a.daysOut);
  const closed = jobs
    .filter((j) => j.returnedAt)
    .sort((a, b) => b.returnedAt!.localeCompare(a.returnedAt!))
    .slice(0, 10)
    .map(row);
  return { open, closed, totalFeePaise: open.reduce((s, r) => s + r.feePaise, 0) };
}
