import {
  MONTH_COLUMNS,
  isMonthSlug,
  monthSlug,
  monthTitle,
  rowsCsv,
} from "@/features/transparency/model";
import { getMonthlyReports } from "@/features/transparency/queries";
import { monthlyReportPdf } from "@/features/transparency/report-pdf";
import { IS_SIMULATION } from "@/lib/environment";

export const runtime = "nodejs";
export const revalidate = 300;

/** A month's report as report.pdf or report.csv. */
export async function GET(_: Request, ctx: RouteContext<"/reports/[month]/[file]">) {
  const { month, file } = await ctx.params;
  if (!isMonthSlug(month) || !["report.pdf", "report.csv"].includes(file))
    return new Response("Not found", { status: 404 });
  const rows = (await getMonthlyReports()) ?? [];
  const row = rows.find((r) => monthSlug(r.month) === month);
  if (!row) return new Response("Not found", { status: 404 });
  if (file === "report.csv")
    return new Response(rowsCsv(MONTH_COLUMNS, [row]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reloop-report-${month}.csv"`,
      },
    });
  const title = monthTitle(
    month,
    rows.map((r) => monthSlug(r.month)!),
    IS_SIMULATION,
  );
  const pdf = await monthlyReportPdf(title, row);
  return new Response(new Blob([pdf as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="reloop-report-${month}.pdf"`,
    },
  });
}
