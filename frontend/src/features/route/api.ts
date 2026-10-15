import { setPickupStatus } from "@/features/hub/loop";
import { rpc } from "@/lib/rpc";
import type { RouteStop } from "./plan";

export const routeSheet = (date: string) => rpc<RouteStop[]>("route_sheet", { p_date: date });

/** Collected, or missed (it moves to the next route day for its market, which is returned). */
export const markStop = (pickupId: string, status: "collected" | "missed") =>
  setPickupStatus(pickupId, status);

export const returnRepairJob = (jobId: string, outcome: "fixed" | "not_fixable") =>
  rpc<null>("return_repair_job", { p_job: jobId, p_outcome: outcome });
