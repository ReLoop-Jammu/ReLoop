import type { Item, Partner, Institution } from "@/features/inventory/model";
import { daysBetween } from "@/features/inventory/rules";
import type { LoopMonth, MonthStats } from "@/features/inventory/stats";

/** One CSV cell: quoted when needed, and guarded against spreadsheet formulas. */
function cell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

const rupees = (paise: number | null | undefined) =>
  paise === null || paise === undefined ? null : (paise / 100).toFixed(2);

/**
 * Hub items for staff spreadsheets. Supplier contact names and phone numbers
 * are never included, nor a household seller's personal name: only the
 * business name of a partner shop or institution.
 */
export function itemsCsv(
  items: readonly Item[],
  partners: readonly Partner[],
  institutions: readonly Institution[],
  now = new Date(),
): string {
  const business = (i: Item) =>
    (i.source.partnerId && partners.find((p) => p.id === i.source.partnerId)?.name) ||
    (i.source.institutionId && institutions.find((x) => x.id === i.source.institutionId)?.name) ||
    (i.source.type === "repair_shop" ||
    i.source.type === "retailer" ||
    i.source.type === "institution"
      ? (i.source.name ?? "")
      : "");
  return toCsv([
    [
      "tag",
      "received",
      "source_type",
      "source_business",
      "category",
      "part_type",
      "brand",
      "model",
      "grade",
      "status",
      "buy_inr",
      "paid_by",
      "list_inr",
      "current_inr",
      "listed",
      "price_cut",
      "sold",
      "sold_inr",
      "days_since_received",
      "weight_kg",
      "data_wiped",
    ],
    ...items.map((i) => [
      i.id,
      i.receivedAt.slice(0, 10),
      i.source.type,
      business(i),
      i.category,
      i.partType,
      i.brand,
      i.model,
      i.grade,
      i.status,
      rupees(i.buyPaise),
      i.purchasePaymentMethod,
      rupees(i.listPaise),
      rupees(i.currentPaise),
      i.listedAt?.slice(0, 10),
      i.priceCutAt?.slice(0, 10),
      i.soldAt?.slice(0, 10),
      rupees(i.soldPaise),
      daysBetween(i.receivedAt, now),
      i.weightKg,
      i.dataWipe.required ? Boolean(i.dataWipe.doneAt) : "",
    ]),
  ]);
}

/** Month-by-month KPIs: items in, grade split, reuse share, sold, scrap kg, and the loop's requests and purchases. */
export function kpiCsv(months: readonly MonthStats[], loop: readonly LoopMonth[] = []): string {
  const all = [...new Set([...months.map((m) => m.month), ...loop.map((l) => l.month)])].sort();
  return toCsv([
    [
      "month",
      "items_in",
      "graded",
      "grade_a",
      "grade_b",
      "grade_c",
      "grade_d",
      "reuse_pct",
      "sold",
      "scrap_kg",
      "reservations",
      "enquiries",
      "institution_pickups",
      "shop_submissions_in",
      "shop_submissions_offered",
      "shop_submissions_purchased",
      "purchased_inr",
    ],
    ...all.map((month) => {
      const m = months.find((x) => x.month === month);
      const l = loop.find((x) => x.month === month);
      return [
        month,
        m?.itemsIn ?? 0,
        m?.graded ?? 0,
        m?.gradeMix.A ?? 0,
        m?.gradeMix.B ?? 0,
        m?.gradeMix.C ?? 0,
        m?.gradeMix.D ?? 0,
        m?.reuseShare == null ? null : Math.round(m.reuseShare * 1000) / 10,
        m?.sold ?? 0,
        (m?.scrapKg ?? 0).toFixed(1),
        l?.reservations ?? 0,
        l?.enquiries ?? 0,
        l?.institutionPickups ?? 0,
        l?.submissionsIn ?? 0,
        l?.submissionsOffered ?? 0,
        l?.submissionsPurchased ?? 0,
        rupees(l?.purchasedPaise ?? 0),
      ];
    }),
  ]);
}
