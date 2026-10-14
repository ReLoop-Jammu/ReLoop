import { Check, Minus, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ShopItem } from "../model";

const WIPE: Record<string, string> = {
  reset_overwrite: "factory reset and overwrite",
  drive_wipe: "full drive wipe",
  drilled: "drive physically destroyed",
};
const RESULT = {
  pass: { icon: Check, label: "Works", className: "text-success" },
  fail: { icon: X, label: "Doesn't work", className: "text-danger" },
  na: { icon: Minus, label: "Not applicable", className: "text-muted" },
} as const;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/**
 * The ReLoop Checked report: what the hub's inspection found, the data wipe
 * and the warranty. Samples say plainly that they weren't inspected.
 */
export function ReLoopChecked({ item }: { item: ShopItem }) {
  if (item.sample)
    return (
      <section
        aria-labelledby="checked-heading"
        className="mt-8 rounded-card border border-dashed border-line-strong p-5"
      >
        <h2
          id="checked-heading"
          className="font-sans text-sm font-semibold tracking-normal text-muted"
        >
          ReLoop Checked
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Sample, not inspected: this item shows how stock will look. Real items carry the report of
          their hub inspection here.
        </p>
      </section>
    );
  const r = item.report;
  if (!r) return null;
  const failed = r.checks.filter((c) => c.result === "fail").length;
  return (
    <section
      aria-labelledby="checked-heading"
      className="mt-8 rounded-card border border-line bg-surface p-5"
    >
      <h2
        id="checked-heading"
        className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
      >
        <ShieldCheck className="size-5 text-brand-600" aria-hidden="true" />
        ReLoop Checked
      </h2>
      <p className="mt-1 text-xs text-muted">
        Inspected at the Jammu hub on {day(r.inspectedAt)}
        {failed > 0 && ` · ${failed} check${failed === 1 ? "" : "s"} didn't pass (see below)`}
      </p>
      {r.checks.length > 0 && (
        <ul className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {r.checks.map((c) => {
            const v = RESULT[c.result];
            return (
              <li key={c.name} className="flex items-center gap-2 text-sm text-ink-soft">
                <v.icon className={cn("size-4 shrink-0", v.className)} aria-hidden="true" />
                <span>
                  {c.name}
                  <span className="sr-only">: {v.label}</span>
                  {c.result !== "pass" && (
                    <span className={cn("ml-1 text-xs", v.className)}>
                      ({v.label.toLowerCase()})
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {(r.batteryHealthPct !== undefined || r.storageHealthPct !== undefined) && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["Battery health", r.batteryHealthPct],
              ["Storage health", r.storageHealthPct],
            ] as const
          ).map(([label, pct]) =>
            pct === undefined ? null : (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink">
                  <span
                    className="h-2 w-24 overflow-hidden rounded-full bg-sunken"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-brand-600"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  {pct}%
                </dd>
              </div>
            ),
          )}
        </dl>
      )}
      <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-sm text-ink-soft">
        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        {r.wipeRequired
          ? r.wipedAt
            ? `Personal data wiped on ${day(r.wipedAt)}${r.wipeMethod ? ` (${WIPE[r.wipeMethod]})` : ""}.`
            : "Personal data is wiped before sale."
          : "This item doesn't store personal data."}
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        {item.warrantyDays
          ? `${item.warrantyDays}-day warranty from the sale for faults present when you buy it. `
          : "Sold as tested, without the device warranty. "}
        <Link href="/warranty" className="font-semibold text-brand-600 underline">
          Warranty terms
        </Link>
      </p>
    </section>
  );
}
