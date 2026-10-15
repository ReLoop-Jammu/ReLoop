import { allPages } from "@/lib/pages";
import { call, rpc } from "@/lib/rpc";
import type { BinStatus } from "@/features/scrap/api";

export type Capacity = {
  bins: (Omit<BinStatus, "kg"> & { kg: number | string })[];
  battery: {
    kg: number | string;
    count: number | string;
    oldest: string | null;
    last_handover: string | null;
    reminder: boolean;
  };
  device_rack: { slots: number | null; used: number; pct: number | null; alert: boolean | null };
  parts_shelf: { count: number };
  ages: {
    devices: { d0_30: number; d31_45: number; d46_plus: number };
    parts: { d0_30: number; d31_plus: number };
  };
};

export const capacityStatus = () => rpc<Capacity>("capacity_status");

export type BatteryLine = {
  id: number;
  at: string;
  kg: number | string;
  source: string;
  battery_count: number | null;
  battery_condition: "good" | "used" | "swollen" | "damaged" | null;
  reused: boolean;
  note: string;
};

/** Battery lines still in the cabinet (not handed over), newest first. */
export const listBatteryLines = () =>
  allPages((headers) =>
    call<BatteryLine[]>(
      "scrap_ledger?select=id,at,kg,source,battery_count,battery_condition,reused,note&bin=eq.batteries&handover_id=is.null&order=at.desc,id.desc",
      { headers },
    ),
  );

export const logBattery = (kg: number, count: number, condition: string, note: string) =>
  rpc<number>("log_battery", { p_kg: kg, p_count: count, p_condition: condition, p_note: note });

export const markBatteryReused = (id: number, note: string) =>
  rpc<null>("mark_battery_reused", { p_ledger: id, p_note: note });
