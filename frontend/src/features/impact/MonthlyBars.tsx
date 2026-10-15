import { monthLabel, type ImpactSummary } from "./flows";
import { formatKg } from "./totals";

/** Scrap kg and items (devices and parts) by month, as plain bars with their values written out. */
export function MonthlyBars({ months }: { months: ImpactSummary["months"] }) {
  if (months.length === 0) return null;
  const maxKg = Math.max(...months.map((m) => m.scrapKg), 1);
  const maxItems = Math.max(...months.map((m) => m.items), 1);
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {(
        [
          ["Scrap weighed (kg)", "scrapKg", maxKg, "bg-brand-600"],
          ["Devices and parts (items)", "items", maxItems, "bg-gold-500"],
        ] as const
      ).map(([title, key, max, bar]) => (
        <div key={key}>
          <h3 className="text-sm font-semibold">{title}</h3>
          <ul className="mt-3 space-y-2">
            {months.map((m) => (
              <li
                key={m.month}
                className="grid grid-cols-[5rem_1fr_4rem] items-center gap-3 text-sm"
              >
                <span className="text-muted">{monthLabel(m.month)}</span>
                <span className="h-3 rounded-full bg-sunken" aria-hidden="true">
                  <span
                    className={`block h-3 rounded-full ${bar}`}
                    style={{ width: `${Math.max((m[key] / max) * 100, m[key] > 0 ? 3 : 0)}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">{formatKg(m[key])}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
