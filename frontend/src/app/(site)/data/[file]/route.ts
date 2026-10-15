import { OPEN_DATA } from "@/features/transparency/open-data";
import { rowsCsv } from "@/features/transparency/model";
import { publicView } from "@/lib/server/public-view";

export const revalidate = 300;

const VIEW: Record<string, string> = {
  "ledger.csv": "public_ledger",
  "monthly.csv": "public_monthly_reports",
  "impact-flows.csv": "impact_flows",
  "network-flows.csv": "network_flows",
};

/** An open-data CSV, straight from its public view (empty, with headers, before the pilot has data). */
export async function GET(_: Request, ctx: RouteContext<"/data/[file]">) {
  const { file } = await ctx.params;
  const spec = OPEN_DATA.find((d) => d.file === file);
  if (!spec) return new Response("Not found", { status: 404 });
  const cols = spec.columns.map(([k]) => k).join(",");
  const rows = (await publicView<Record<string, unknown>>(VIEW[file], `select=${cols}`)) ?? [];
  return new Response(rowsCsv(spec.columns, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reloop-${file}"`,
    },
  });
}
