import "server-only";

import { publicView } from "@/lib/server/public-view";
import type { ActivityRow, LedgerRow, MonthRow } from "./model";

export const getLedger = () =>
  publicView<LedgerRow>(
    "public_ledger",
    "select=date,source,institution,screens_kg,boards_kg,other_kg,d_devices_kg,batteries_kg,before_bins_kg,total_kg,receipt_ref&order=date.desc",
  );

export const getMonthlyReports = () =>
  publicView<MonthRow>("public_monthly_reports", "select=*&order=month.asc");

export const getActivityFeed = () =>
  publicView<ActivityRow>("activity_feed", "select=day,kind,category,place,who");
