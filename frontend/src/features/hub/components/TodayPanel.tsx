"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SHARED_DATABASE } from "@/features/inventory/store";
import type { Item } from "@/features/inventory/model";
import {
  BIN_LABEL,
  binStatus,
  listWeighins,
  type BinStatus,
  type Weighin,
} from "@/features/scrap/api";
import { cn } from "@/lib/utils/cn";
import { todaySummary } from "../today";
import { Panel } from "./ui";

/** Today at the hub: what came in, went on sale and sold, today's weigh-ins and how full each bin is. */
export function TodayPanel({ items }: { items: readonly Item[] }) {
  const [scrap, setScrap] = useState<{ weighins: Weighin[]; bins: BinStatus[] } | null>(null);

  useEffect(() => {
    if (!SHARED_DATABASE) return;
    let live = true;
    Promise.all([listWeighins(), binStatus()])
      .then(([weighins, bins]) => live && setScrap({ weighins, bins }))
      .catch(() => live && setScrap({ weighins: [], bins: [] }));
    return () => {
      live = false;
    };
  }, []);

  const s = todaySummary(items, scrap?.weighins ?? [], scrap?.bins ?? [], new Date());
  const figures: [string, string, string][] = [
    ["Items received", String(s.received), "/hub/items"],
    ["Listed today", String(s.listed), "/hub/items?status=listed"],
    ["Sold today", String(s.sold), "/hub/items?status=sold"],
    ...(SHARED_DATABASE
      ? ([["Weigh-ins", `${s.weighins} · ${s.weighedKg} kg`, "/hub/weighins"]] as [
          string,
          string,
          string,
        ][])
      : []),
  ];
  return (
    <Panel title="Today at the hub">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {figures.map(([label, value, href]) => (
          <div key={label}>
            <dt className="text-xs text-muted">
              <Link href={href} className="underline-offset-2 hover:underline">
                {label}
              </Link>
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {s.bins.length > 0 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Scrap bins">
          {s.bins.map((b) => (
            <li key={b.bin} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-3 text-sm">
              <span>{BIN_LABEL[b.bin]}</span>
              <span className="h-2.5 rounded-full bg-sunken" aria-hidden="true">
                <span
                  className={cn(
                    "block h-2.5 rounded-full",
                    b.due ? "bg-danger" : b.near ? "bg-gold-500" : "bg-brand-600",
                  )}
                  style={{ width: `${b.fillPct}%` }}
                />
              </span>
              <span className="text-right tabular-nums">
                {b.kg} kg
                {b.due && <span className="sr-only"> (handover due)</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
