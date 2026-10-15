import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  MONTH_COLUMNS,
  isMonthSlug,
  monthSlug,
  monthTitle,
  num,
} from "@/features/transparency/model";
import { getMonthlyReports } from "@/features/transparency/queries";
import { IS_SIMULATION } from "@/lib/environment";

export const revalidate = 300;

async function find(month: string) {
  if (!isMonthSlug(month)) return null;
  const rows = (await getMonthlyReports()) ?? [];
  const row = rows.find((r) => monthSlug(r.month) === month);
  if (!row) return null;
  const slugs = rows.map((r) => monthSlug(r.month)!);
  return { row, title: monthTitle(month, slugs, IS_SIMULATION) };
}

export async function generateMetadata({
  params,
}: PageProps<"/reports/[month]">): Promise<Metadata> {
  const found = await find((await params).month);
  return found ? { title: `Monthly report: ${found.title}` } : { title: "Monthly report" };
}

export default async function MonthPage({ params }: PageProps<"/reports/[month]">) {
  const { month } = await params;
  const found = await find(month);
  if (!found) notFound();
  const { row, title } = found;
  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>
        <Link href="/reports" className="underline">
          Monthly reports
        </Link>
      </Eyebrow>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h1>
      <dl className="mt-10 grid max-w-3xl gap-x-8 gap-y-4 sm:grid-cols-2">
        {MONTH_COLUMNS.filter(([k]) => k !== "month").map(([key, label]) => (
          <div key={key} className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="font-semibold tabular-nums">{num(row[key as keyof typeof row])}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 flex flex-wrap gap-4 text-sm">
        <a href={`/reports/${month}/report.pdf`} className="font-semibold text-brand-600 underline">
          Download as PDF
        </a>
        <a href={`/reports/${month}/report.csv`} className="font-semibold text-brand-600 underline">
          Download as CSV
        </a>
      </p>
    </Container>
  );
}
