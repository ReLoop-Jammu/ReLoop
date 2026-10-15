"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Table, Td, Th } from "@/components/ui/Table";
import { SHARED_DATABASE } from "@/features/inventory/store";
import {
  listMargins,
  pricingBenchmarks,
  type Benchmarks,
  type MarginRow,
} from "@/features/pricing/api";
import {
  benchmarksSet,
  groupStats,
  marginsCsv,
  monthlyBuyVsSale,
  pricingFlags,
} from "@/features/pricing/dashboard";
import { formatPrice } from "@/lib/utils/money";
import { downloadFile } from "../photos";
import { PageTitle, Panel } from "./ui";

const money = (p: number | null) => (p === null ? "—" : formatPrice(p));

/** Staff-only pricing: what we pay and sell for by category and grade, COGS, days to sell and sell-through. */
export function PricingPage() {
  return (
    <>
      <PageTitle
        title="Pricing"
        description="Staff only. COGS is what we paid, plus repair fees, plus handling. Flags compare against the business plan's unit figures held in staff settings; there is no margin target. Shop-listed parts earn a commission and are not margin-tested."
        actions={
          <Link
            href="/hub/pricing/references"
            className="text-sm font-semibold text-brand-600 underline"
          >
            Price references
          </Link>
        }
      />
      {SHARED_DATABASE ? (
        <Dashboard />
      ) : (
        <p className="text-sm text-muted">Pricing is kept in the shared database.</p>
      )}
    </>
  );
}

function Dashboard() {
  const [rows, setRows] = useState<MarginRow[] | null>(null);
  const [bench, setBench] = useState<Benchmarks>({});
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([listMargins(), pricingBenchmarks()])
      .then(([r, b]) => {
        setRows(r);
        setBench(b);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Pricing didn't load."));
  }, []);

  if (error)
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  if (!rows)
    return (
      <p role="status" className="text-sm text-muted">
        Loading pricing…
      </p>
    );
  const groups = groupStats(rows);
  const months = monthlyBuyVsSale(rows);
  const flags = pricingFlags(rows, bench);
  const set = benchmarksSet(bench);
  const commission = rows.filter((r) => r.commission_item && r.commission_paise !== null);

  return (
    <div className="space-y-6">
      {!(set.device && set.spread) && (
        <Notice tone="info" role="note">
          The plan&apos;s unit figures are not all set yet (
          {[
            !set.device && "finance.device_unit_paise",
            !set.spread && "finance.scrap_spread_paise_per_kg",
          ]
            .filter(Boolean)
            .join(", ")}
          ). Until they are, nothing is flagged. An admin enters them in Settings.
        </Notice>
      )}
      {flags.length > 0 && (
        <Panel title={`Flags (${flags.length})`}>
          <ul className="space-y-1 text-sm">
            {flags.slice(0, 50).map((f) => (
              <li key={f.itemId ?? f.bin}>
                {f.itemId ? (
                  <Link href={`/hub/items/${f.itemId}`} className="text-brand-600 underline">
                    {f.message}
                  </Link>
                ) : (
                  f.message
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="By category and grade">
        {groups.length === 0 ? (
          <p className="text-sm text-muted">No graded items yet.</p>
        ) : (
          <Table caption="Prices, costs and sell-through by category and grade">
            <thead>
              <tr>
                <Th>Category · grade</Th>
                <Th className="text-right">Sold</Th>
                <Th className="text-right">In stock</Th>
                <Th className="text-right">Avg buy</Th>
                <Th className="text-right">Avg sale</Th>
                <Th className="text-right">Avg COGS</Th>
                <Th className="text-right">Avg margin</Th>
                <Th className="text-right">Days to sell</Th>
                <Th className="text-right">Sell-through</Th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.key}>
                  <Td>{g.key}</Td>
                  <Td className="text-right tabular-nums">{g.sold}</Td>
                  <Td className="text-right tabular-nums">{g.inStock}</Td>
                  <Td className="text-right tabular-nums">{money(g.avgBuy)}</Td>
                  <Td className="text-right tabular-nums">{money(g.avgSale)}</Td>
                  <Td className="text-right tabular-nums">{money(g.avgCogs)}</Td>
                  <Td className="text-right tabular-nums">{money(g.avgMargin)}</Td>
                  <Td className="text-right tabular-nums">{g.avgDaysToSell ?? "—"}</Td>
                  <Td className="text-right tabular-nums">
                    {g.sellThrough === null ? "—" : `${Math.round(g.sellThrough * 100)}%`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Buy against sale, by month sold">
          {months.length === 0 ? (
            <p className="text-sm text-muted">Nothing sold yet.</p>
          ) : (
            <Table caption="Average buy and sale price by month">
              <thead>
                <tr>
                  <Th>Month</Th>
                  <Th className="text-right">Sold</Th>
                  <Th className="text-right">Avg buy</Th>
                  <Th className="text-right">Avg sale</Th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month}>
                    <Td>{m.month}</Td>
                    <Td className="text-right tabular-nums">{m.sold}</Td>
                    <Td className="text-right tabular-nums">{money(m.avgBuy)}</Td>
                    <Td className="text-right tabular-nums">{money(m.avgSale)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel title="Parts Exchange commission">
          <p className="text-3xl font-bold tabular-nums">
            {formatPrice(commission.reduce((s, r) => s + Number(r.commission_paise), 0))}
          </p>
          <p className="text-sm text-muted">
            from {commission.length} shop-listed {commission.length === 1 ? "part" : "parts"} sold
            (commission, not margin)
          </p>
        </Panel>
      </div>

      <div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadFile(
              `reloop-margins-${new Date().toISOString().slice(0, 10)}.csv`,
              marginsCsv(rows),
              "text/csv",
            )
          }
        >
          Download margins (CSV)
        </Button>
        <p className="mt-2 text-xs text-muted">
          Staff only: it holds buy prices and margins, but no supplier names or contacts.
        </p>
      </div>
    </div>
  );
}
