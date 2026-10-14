"use client";

import { AlertTriangle, ArrowRight, Download, Info, PackagePlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { BUSINESS_RULES } from "@/config/business-rules";
import { STATUSES } from "@/features/inventory/model";
import { hubAlerts } from "@/features/inventory/rules";
import { dashboardStats, loopStats, type LoopMonth } from "@/features/inventory/stats";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { listRequests, listShopSubmissions } from "../loop";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/money";
import { itemsCsv, kpiCsv } from "../csv";
import { downloadFile } from "../photos";
import { reportHubError, useHubData } from "../useHubData";
import { PageTitle, Panel, Stat } from "./ui";

const T = BUSINESS_RULES.targets;
const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);

export function Dashboard() {
  const { items, partners, institutions, handovers, loaded } = useHubData();
  const loop = useLoop();
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
        title="KPIs"
        description={`The business plan's targets: ${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`}
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

      <GradeSplit items={items} />
      {SHARED_DATABASE && <LoopPanel month={loop.find((l) => l.month === month)} />}

      <Panel
        title="Month by month"
        className="mt-6 overflow-x-auto"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClasses({ size: "sm", variant: "secondary" })}
              onClick={() =>
                downloadFile(`reloop-kpis-${month}.csv`, kpiCsv(stats.months, loop), "text/csv")
              }
            >
              <Download className="size-4" aria-hidden="true" /> KPIs (CSV)
            </button>
            <button
              type="button"
              className={buttonClasses({ size: "sm", variant: "secondary" })}
              onClick={() =>
                downloadFile(
                  `reloop-items-${month}.csv`,
                  itemsCsv(items, partners, institutions, now),
                  "text/csv",
                )
              }
            >
              <Download className="size-4" aria-hidden="true" /> Items (CSV)
            </button>
          </div>
        }
      >
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

const GRADE_COLOURS = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
} as const;

/** Share of graded items in each grade, all time. */
function GradeSplit({ items }: { items: readonly { grade: "A" | "B" | "C" | "D" | null }[] }) {
  const graded = items.filter((i) => i.grade);
  const counts = (["A", "B", "C", "D"] as const).map((g) => ({
    grade: g,
    n: graded.filter((i) => i.grade === g).length,
  }));
  return (
    <Panel title="Grade split (all graded items)" className="mt-6">
      {graded.length === 0 ? (
        <p className="text-sm text-muted">Appears once items are graded.</p>
      ) : (
        <>
          <div className="flex h-4 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
            {counts.map(({ grade, n }) =>
              n ? (
                <div
                  key={grade}
                  className={GRADE_COLOURS[grade]}
                  style={{ width: `${(n / graded.length) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
            {counts.map(({ grade, n }) => (
              <li key={grade}>
                Grade {grade}: <strong>{n}</strong> ({pct(n / graded.length)})
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/** Requests and shop submissions by month (shared database only). */
function useLoop(): LoopMonth[] {
  const [loop, setLoop] = useState<LoopMonth[]>([]);
  useEffect(() => {
    if (!SHARED_DATABASE) return;
    Promise.all([listRequests(), listShopSubmissions()])
      .then(([requests, submissions]) => setLoop(loopStats(requests, submissions)))
      .catch(reportHubError);
  }, []);
  return loop;
}

function LoopPanel({ month }: { month: LoopMonth | undefined }) {
  const n = (v: number | undefined) => v ?? 0;
  return (
    <Panel title="The loop this month" className="mt-6">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["Reservations", n(month?.reservations), "/hub/requests"],
          ["Questions", n(month?.enquiries), "/hub/requests"],
          ["Institution pickups", n(month?.institutionPickups), "/hub/requests"],
          ["Shop submissions in", n(month?.submissionsIn), "/hub/submissions"],
          ["Offers made", n(month?.submissionsOffered), "/hub/submissions"],
          ["Bought from shops", n(month?.submissionsPurchased), "/hub/submissions"],
        ].map(([label, value, href]) => (
          <div key={label as string} className="rounded-lg bg-sunken p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">
              <Link href={href as string}>{value}</Link>
            </dd>
          </div>
        ))}
        <div className="rounded-lg bg-sunken p-3">
          <dt className="text-xs text-muted">Paid to shops</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">
            {formatPrice(n(month?.purchasedPaise))}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
