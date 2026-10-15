"use client";

import { useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { formatPrice } from "@/lib/utils/money";

type Dashboard = {
  submitted: number;
  offers_waiting: number;
  accepted: number;
  picked_up: number;
  paid_out_paise: number | string;
  weighins: number;
  kg_weighed: number | string;
  items_bought: number;
  kg_items_measured: number | string;
  kg_items_estimated: number | string;
  listings: Record<string, number>;
  parts_sold: number;
  parts_share_paise: number | string;
  in_directory: boolean | null;
};

const kg = (v: number | string) => `${Number(v).toFixed(1)} kg`;

/** The shop's own partnership in numbers: exact kg here only, estimates labelled. */
export function MyPartnership() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    rpc<Dashboard>("my_partner_dashboard")
      .then(setD)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load."));
  }, []);
  if (error)
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        {error}
      </p>
    );
  if (!d) return <p className="mt-3 text-sm text-muted">Loading your numbers…</p>;
  const listed = Object.values(d.listings ?? {}).reduce((a, b) => a + b, 0);
  const figures: [string, string][] = [
    ["Submitted", String(d.submitted)],
    ["Offers waiting", String(d.offers_waiting)],
    ["Accepted", String(d.accepted)],
    ["Picked up", String(d.picked_up)],
    ["Paid to you", formatPrice(Number(d.paid_out_paise))],
    ["Weigh-ins", `${d.weighins} · ${kg(d.kg_weighed)}`],
    ["Parts listed", String(listed)],
    ["Parts sold", `${d.parts_sold} · ${formatPrice(Number(d.parts_share_paise))} your share`],
  ];
  const estimated = Number(d.kg_items_estimated);
  return (
    <div className="mt-3">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-ink-soft">
        Devices and parts we bought from you: {d.items_bought}, weighing {kg(d.kg_items_measured)}
        {estimated > 0 && <> plus about {kg(estimated)} (estimated, not weighed)</>}.
      </p>
      <p className="mt-1 text-xs text-muted">
        {d.in_directory
          ? "Your shop is listed in the public partner directory, with its weight in bands only."
          : "Your shop is not in the public partner directory. Ask us if you would like to be listed."}
      </p>
    </div>
  );
}
