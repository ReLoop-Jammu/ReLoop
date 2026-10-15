import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatKg } from "@/features/impact/totals";
import { monthSlug, monthTitle, num } from "@/features/transparency/model";
import { getMonthlyReports } from "@/features/transparency/queries";
import { IS_SIMULATION } from "@/lib/environment";

export const metadata: Metadata = {
  title: "Monthly reports",
  description:
    "Every month of the Jammu pilot in numbers: kg weighed, kg to VRRG Group, devices and parts.",
};

export const revalidate = 300;

export default async function ReportsPage() {
  const rows = (await getMonthlyReports()) ?? [];
  const slugs = rows.map((r) => monthSlug(r.month)!).filter(Boolean);
  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>Transparency</Eyebrow>
      <h1 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-6xl">Monthly reports</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
        One page per month, from weighed and tagged records, with a PDF and a CSV.
      </p>
      {rows.length === 0 ? (
        <p
          role="status"
          className="mt-10 rounded-card border border-line bg-surface p-6 text-ink-soft shadow-soft"
        >
          <strong className="text-ink">The pilot is starting.</strong> The first report appears
          after the first month with weigh-ins.
        </p>
      ) : (
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {[...rows].reverse().map((r) => {
            const slug = monthSlug(r.month)!;
            return (
              <li key={slug}>
                <Link
                  href={`/reports/${slug}`}
                  className="block rounded-card border border-line bg-surface p-5 shadow-soft hover:border-line-strong"
                >
                  <span className="font-semibold">{monthTitle(slug, slugs, IS_SIMULATION)}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {formatKg(num(r.kg_weighed))} kg weighed · {formatKg(num(r.kg_to_vrrg))} kg to
                    VRRG Group
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
