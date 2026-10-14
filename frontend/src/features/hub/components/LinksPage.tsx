"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { Table, Td, Th } from "@/components/ui/Table";
import { shortUrl, TRACKED_LINKS } from "@/config/tracked-links";
import {
  bucketVisits,
  linkVisitCounts,
  linkVisitSeries,
  type Bucket,
  type LinkVisitCount,
  type LinkVisitDay,
} from "@/features/locations/link-visits";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { toCsv } from "../csv";
import { downloadFile } from "../photos";
import { RequireRole } from "./RequireRole";
import { Field, PageTitle, Panel, Select } from "./ui";

/** Today's date in India, as YYYY-MM-DD (the series is grouped by Indian days). */
const indiaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export function LinksPage() {
  return (
    <RequireRole role="admin">
      <PageTitle
        title="Links & QR codes"
        description="Visits per short link (/go/…) and QR code. Each counted visit stores only the link, its source and medium, and the time."
      />
      {SHARED_DATABASE ? (
        <Links />
      ) : (
        <p className="text-sm text-muted">Link visits are kept in the shared database.</p>
      )}
    </RequireRole>
  );
}

function Links() {
  const [days, setDays] = useState(30);
  const [by, setBy] = useState<"day" | "week">("day");
  const [series, setSeries] = useState<LinkVisitDay[] | null>(null);
  const [counts, setCounts] = useState<LinkVisitCount[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([linkVisitSeries(days), linkVisitCounts()])
      .then(([s, c]) => {
        if (!alive) return;
        setSeries(s);
        setCounts(c);
        setError("");
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Couldn't load."));
    return () => {
      alive = false;
    };
  }, [days]);

  const today = indiaToday();
  const buckets = series ? bucketVisits(series, days, by, today) : [];
  const inRange = (slug: string) =>
    series?.filter((r) => r.slug === slug).reduce((s, r) => s + r.visits, 0) ?? 0;
  const count = (slug: string, key: "this_month" | "all_time") =>
    counts?.find((c) => c.slug === slug)?.[key] ?? 0;

  function download() {
    const rows = [
      ["date", "link", "visits"],
      ...(series ?? []).map((r) => [r.day, `/go/${r.slug}`, r.visits]),
    ];
    downloadFile(`reloop-link-visits-${today}-${days}d.csv`, toCsv(rows), "text/csv");
  }

  return (
    <div className="grid gap-6">
      <Panel
        title="Visits over time"
        actions={
          <button
            type="button"
            onClick={download}
            disabled={!series}
            className={buttonClasses({ size: "sm", variant: "secondary" })}
          >
            <Download className="size-4" aria-hidden="true" /> Visits per day (CSV)
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-4">
          <Field label="Period" htmlFor="links-days">
            <Select id="links-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 12 months</option>
            </Select>
          </Field>
          <Field label="Group by" htmlFor="links-by">
            <Select
              id="links-by"
              value={by}
              onChange={(e) => setBy(e.target.value as "day" | "week")}
            >
              <option value="day">Day</option>
              <option value="week">Week (from Monday)</option>
            </Select>
          </Field>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : !series ? (
          <p role="status" className="text-sm text-muted">
            Loading visits…
          </p>
        ) : series.length === 0 ? (
          <p className="text-sm text-muted">No visits in this period yet.</p>
        ) : (
          <VisitChart buckets={buckets} by={by} />
        )}
      </Panel>

      <Table caption="Visits per link">
        <thead>
          <tr>
            <Th>Link</Th>
            <Th>Used for</Th>
            <Th className="text-right">In this period</Th>
            <Th className="text-right">This month</Th>
            <Th className="text-right">All time</Th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {TRACKED_LINKS.map((l) => (
            <tr key={l.slug}>
              <Td className="font-mono text-xs">/go/{l.slug}</Td>
              <Td>{l.use}</Td>
              <Td className="text-right">{series ? inRange(l.slug) : "—"}</Td>
              <Td className="text-right">{counts ? count(l.slug, "this_month") : "—"}</Td>
              <Td className="text-right">{counts ? count(l.slug, "all_time") : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="text-xs text-muted">
        For example {shortUrl(TRACKED_LINKS[0])}. Link previews and crawlers aren&apos;t counted.
        Days follow India time. The list of links is in docs/report/tracked-links.md.
      </p>
    </div>
  );
}

const label = (start: string, by: "day" | "week") =>
  new Date(`${start}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }) + (by === "week" ? " (week)" : "");

/** Bars of total visits, with the numbers in a table for screen readers. */
function VisitChart({ buckets, by }: { buckets: Bucket[]; by: "day" | "week" }) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const w = 640;
  const h = 160;
  const gap = buckets.length > 60 ? 1 : 3;
  const bar = Math.max(1, (w - gap * (buckets.length - 1)) / buckets.length);
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full" aria-hidden="true">
        {buckets.map((b, i) => {
          const bh = (b.total / max) * h;
          return (
            <rect
              key={b.start}
              x={i * (bar + gap)}
              y={h - bh}
              width={bar}
              height={Math.max(bh, b.total ? 2 : 0)}
              rx={Math.min(3, bar / 2)}
              className="fill-brand-600"
            >
              <title>{`${label(b.start, by)}: ${b.total}`}</title>
            </rect>
          );
        })}
        <line x1={0} x2={w} y1={h} y2={h} className="stroke-line" />
        <text x={0} y={h + 15} className="fill-muted text-[11px]">
          {label(buckets[0].start, by)}
        </text>
        <text x={w} y={h + 15} textAnchor="end" className="fill-muted text-[11px]">
          {label(buckets[buckets.length - 1].start, by)}
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        Most in one {by}: {max}. Total: {buckets.reduce((s, b) => s + b.total, 0)}.
      </figcaption>
      <table className="sr-only">
        <caption>Visits per {by}</caption>
        <tbody>
          {buckets
            .filter((b) => b.total)
            .map((b) => (
              <tr key={b.start}>
                <th scope="row">{label(b.start, by)}</th>
                <td>{b.total}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </figure>
  );
}
