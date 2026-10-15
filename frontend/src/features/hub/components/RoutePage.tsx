"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { markStop, routeSheet } from "@/features/route/api";
import {
  expectation,
  groupStops,
  nextRouteDays,
  routeDayLabel,
  type RouteStop,
} from "@/features/route/plan";
import { cn } from "@/lib/utils/cn";
import { PageTitle, Panel } from "./ui";

/** The run sheet for a Tuesday or Friday: stops in route order, with the actions the driver needs. */
export function RoutePage() {
  return (
    <>
      <div className="print:hidden">
        <PageTitle
          title="Route"
          description="Tuesday and Friday run sheets: weekly partner stops and booked lots, in route order. Mark a booked lot collected or missed (a missed lot moves to the next route day for its market), and weigh a stop's scrap on the spot."
        />
      </div>
      {SHARED_DATABASE ? (
        <Sheet />
      ) : (
        <p className="text-sm text-muted">The route is kept in the shared database.</p>
      )}
    </>
  );
}

function Sheet() {
  // Computed after mount so the server and browser agree on "today".
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState("");
  const [stops, setStops] = useState<RouteStop[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const d = nextRouteDays(new Date(), 4);
    // Reading the clock must happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDays(d);
    setDay(d[0]);
  }, []);

  const load = useCallback(async (d: string) => {
    setStops(null);
    setError("");
    try {
      setStops(await routeSheet(d));
    } catch (e) {
      setStops([]);
      setError(e instanceof Error ? e.message : "The route didn't load.");
    }
  }, []);
  useEffect(() => {
    // Loading starts here and ends in state set by load().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (day) void load(day);
  }, [day, load]);

  async function mark(id: string, status: "collected" | "missed") {
    setBusy(id);
    setError("");
    try {
      await markStop(id, status);
      await load(day);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save.");
    } finally {
      setBusy("");
    }
  }

  const groups = stops ? groupStops(stops, day) : [];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === day}
            onClick={() => setDay(d)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm font-medium",
              d === day
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-ink-soft hover:border-line-strong",
            )}
          >
            {routeDayLabel(d)}
          </button>
        ))}
        <Button size="sm" variant="secondary" onClick={() => window.print()} className="ml-auto">
          <Printer className="size-4" aria-hidden="true" /> Print the run sheet
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-bg p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {day && (
        <h2 className="mb-3 hidden text-xl font-bold print:block">
          Run sheet: {routeDayLabel(day)}
        </h2>
      )}
      {stops === null ? (
        <p role="status" className="text-sm text-muted">
          Loading the run sheet…
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted">
          No stops on {day ? routeDayLabel(day) : "this day"}. Partner shops appear here on their
          route day once their market has started; booked lots appear on their booked date.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <Panel key={g.market} title={g.market}>
              <ol className="divide-y divide-line">
                {g.stops.map((s, i) => (
                  <li
                    key={s.pickup_id ?? s.partner_id ?? `${g.market}-${i}`}
                    className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {s.name}
                        {s.times_missed > 0 && (
                          <span className="ml-2 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">
                            Missed {s.times_missed}×
                          </span>
                        )}
                      </p>
                      <p className="text-muted">{expectation(s)}</p>
                      {s.phone && (
                        <a href={`tel:${s.phone}`} className="text-brand-600 underline">
                          {s.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 print:hidden">
                      {s.stop_kind === "standing" && s.partner_id && (
                        <Link
                          href={`/hub/weighins?partner=${s.partner_id}`}
                          className="inline-flex min-h-10 items-center rounded-lg border border-line-strong px-3 font-medium hover:bg-sunken"
                        >
                          Weigh scrap
                        </Link>
                      )}
                      {s.pickup_id && (
                        <>
                          <Button
                            size="sm"
                            disabled={busy === s.pickup_id}
                            onClick={() => void mark(s.pickup_id!, "collected")}
                          >
                            Collected
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy === s.pickup_id}
                            onClick={() => void mark(s.pickup_id!, "missed")}
                          >
                            Missed
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
