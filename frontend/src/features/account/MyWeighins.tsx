"use client";

import { useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { formatPrice } from "@/lib/utils/money";

type Row = {
  id: string;
  weighed_at: string;
  screens_kg: number | string;
  boards_kg: number | string;
  batteries_kg: number | string;
  other_kg: number | string;
  amount_paise: number | string;
  to_test_count: number;
};

const kg = (n: number | string) => Number(n).toFixed(1);

/** The shop's own scrap weigh-ins: kg by category and what was paid at the counter. */
export function MyWeighins() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    rpc<Row[]>("my_weighins")
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load."));
  }, []);
  if (error)
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        {error}
      </p>
    );
  if (!rows) return <p className="mt-3 text-sm text-muted">Loading your weigh-ins…</p>;
  if (rows.length === 0)
    return (
      <p className="mt-3 text-sm text-muted">
        No scrap weighed yet. After our first visit to your market, each weigh-in shows here with
        its kilos and what was paid.
      </p>
    );
  const total = rows.reduce(
    (s, r) =>
      s + Number(r.screens_kg) + Number(r.boards_kg) + Number(r.batteries_kg) + Number(r.other_kg),
    0,
  );
  return (
    <>
      <p className="mt-2 text-sm text-muted">
        {rows.length} weigh-ins, {kg(total)} kg in all. The kilos are weighed in front of you, so
        these are the weights that were paid.
      </p>
      <ul className="mt-3 divide-y divide-line rounded-card border border-line text-sm">
        {rows.slice(0, 12).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>
              {new Date(r.weighed_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
              : screens {kg(r.screens_kg)} · boards {kg(r.boards_kg)} · batteries{" "}
              {kg(r.batteries_kg)} · other {kg(r.other_kg)} kg
              {r.to_test_count > 0 && ` · ${r.to_test_count} to test`}
            </span>
            <span className="font-semibold tabular-nums">
              {formatPrice(Number(r.amount_paise))}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
