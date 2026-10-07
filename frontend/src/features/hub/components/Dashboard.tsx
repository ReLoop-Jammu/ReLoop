"use client";

import { AlertTriangle, ArrowRight, Info, PackagePlus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { BUSINESS_RULES } from "@/config/business-rules";
import { STATUSES } from "@/features/inventory/model";
import { hubAlerts } from "@/features/inventory/rules";
import { dashboardStats } from "@/features/inventory/stats";
import { cn } from "@/lib/utils/cn";
import { useHubData } from "../useHubData";
import { PageTitle, Panel, Stat } from "./ui";

const T = BUSINESS_RULES.targets;
const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);

export function Dashboard() {
  const { items, partners, handovers, loaded } = useHubData();
  const now = new Date();
  const stats = dashboardStats(items, handovers, partners, now);
  const month = now.toISOString().slice(0, 7);
  const thisMonth = stats.months.find((m) => m.month === month);
  const alerts = hubAlerts(items, handovers, now);
  const byStatus = STATUSES.map((s) => ({
    ...s,
    count: items.filter((i) => i.status === s.value).length,
  })).filter((s) => s.count);

  return (
    <>
      <PageTitle
        title="Dashboard"
        description={now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        actions={
          <Link href="/hub/intake" className={buttonClasses({ size: "sm" })}>
            <PackagePlus className="size-4" aria-hidden="true" /> Log new item
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Items in this month"
          value={String(thisMonth?.itemsIn ?? 0)}
          target={`${T.itemsPerMonth} by month 6`}
          ok={thisMonth ? thisMonth.itemsIn >= T.itemsPerMonth : null}
        />
        <Stat
          label="Reused (A + B + C)"
          value={pct(thisMonth?.reuseShare ?? null)}
          target={`≥ ${pct(T.reuseShare)}`}
          ok={thisMonth?.reuseShare == null ? null : thisMonth.reuseShare >= T.reuseShare}
        />
        <Stat
          label="Average stock age"
          value={stats.avgStockAgeDays === null ? "–" : `${Math.round(stats.avgStockAgeDays)} d`}
          target={`< ${T.avgStockAgeDays} days`}
          ok={stats.avgStockAgeDays === null ? null : stats.avgStockAgeDays < T.avgStockAgeDays}
        />
        <Stat
          label="Scrap handed over"
          value={`${(thisMonth?.scrapKg ?? 0).toFixed(1)} kg`}
          target="100% with receipt"
        />
        <Stat
          label="Active partner shops"
          value={String(stats.activePartners)}
          target={String(T.activePartnerShops)}
          ok={stats.activePartners >= T.activePartnerShops}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Needs attention">
          {!loaded ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-grade-a">
              <Info className="size-4" aria-hidden="true" /> All clear.
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li
                  key={a.message}
                  className={cn(
                    "flex gap-2 rounded-lg p-3 text-sm",
                    a.level === "act" ? "bg-grade-d-bg text-grade-d" : "bg-grade-c-bg text-grade-c",
                  )}
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {a.message}
                    {a.itemIds && a.itemIds.length <= 6 && (
                      <span className="mt-1 block font-mono text-xs opacity-80">
                        {a.itemIds.join(" · ")}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Where items are now">
          {byStatus.length === 0 ? (
            <p className="text-sm text-muted">No items yet. Log the first one from Intake.</p>
          ) : (
            <ul className="divide-y divide-line">
              {byStatus.map((s) => (
                <li key={s.value}>
                  <Link
                    href={`/hub/items?status=${s.value}`}
                    className="flex items-center justify-between py-2 text-sm hover:text-brand-600"
                  >
                    {s.label}
                    <span className="flex items-center gap-1 font-semibold">
                      {s.count} <ArrowRight className="size-3.5 text-muted" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Month by month" className="mt-6 overflow-x-auto">
        {stats.months.length === 0 ? (
          <p className="text-sm text-muted">Figures appear once items are logged.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  Month
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Items in
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  A / B / C / D
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Reuse
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Sold
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Scrap kg
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {stats.months.map((m) => (
                <tr key={m.month}>
                  <td className="py-2">{m.month}</td>
                  <td className="py-2 text-right">{m.itemsIn}</td>
                  <td className="py-2 text-right">
                    {m.gradeMix.A} / {m.gradeMix.B} / {m.gradeMix.C} / {m.gradeMix.D}
                  </td>
                  <td className="py-2 text-right">{pct(m.reuseShare)}</td>
                  <td className="py-2 text-right">{m.sold}</td>
                  <td className="py-2 text-right">{m.scrapKg.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-muted">
          Planned grade mix: A {pct(BUSINESS_RULES.plannedGradeMix.A)}, B{" "}
          {pct(BUSINESS_RULES.plannedGradeMix.B)}, C {pct(BUSINESS_RULES.plannedGradeMix.C)}, D{" "}
          {pct(BUSINESS_RULES.plannedGradeMix.D)}. Replace with real data after the first month.
        </p>
      </Panel>
    </>
  );
}
