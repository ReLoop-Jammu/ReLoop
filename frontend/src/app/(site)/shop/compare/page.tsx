import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { ItemVisual } from "@/features/inventory/components/ItemVisual";
import { categoryLabel } from "@/features/inventory/model";
import { itemSaving, type ShopItem } from "@/features/shop/model";
import { getShopItemsByIds } from "@/features/shop/queries";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Compare items",
  description: "Up to three ReLoop items side by side: price, grade, inspection, warranty.",
  robots: { index: false, follow: true },
};

const ROWS: { label: string; value: (i: ShopItem) => string }[] = [
  { label: "Price", value: (i) => formatPrice(i.pricePaise) },
  { label: "Saving", value: (i) => (itemSaving(i) ? `About ${formatPrice(itemSaving(i))}` : "—") },
  { label: "Kind", value: (i) => categoryLabel(i.category) },
  {
    label: "Checks that work",
    value: (i) =>
      i.report
        ? `${i.report.checks.filter((c) => c.result === "pass").length} of ${i.report.checks.filter((c) => c.result !== "na").length}`
        : "—",
  },
  {
    label: "Battery health",
    value: (i) =>
      i.report?.batteryHealthPct !== undefined ? `${i.report.batteryHealthPct}%` : "—",
  },
  {
    label: "Storage health",
    value: (i) =>
      i.report?.storageHealthPct !== undefined ? `${i.report.storageHealthPct}%` : "—",
  },
  {
    label: "Personal data",
    value: (i) =>
      i.report
        ? i.report.wipeRequired
          ? i.report.wipedAt
            ? "Wiped"
            : "Wiped before sale"
          : "Stores none"
        : i.dataWiped
          ? "Wiped"
          : "—",
  },
  {
    label: "Warranty",
    value: (i) => (i.warrantyDays ? `${i.warrantyDays} days` : "None (sold as tested)"),
  },
  { label: "Ships outside Jammu", value: (i) => (i.shipsIndia ? "Yes" : "No: Jammu only") },
];

export default async function ComparePage({ searchParams }: PageProps<"/shop/compare">) {
  const raw = (await searchParams).ids;
  const ids = [...new Set(String(Array.isArray(raw) ? raw[0] : (raw ?? "")).split(","))]
    .filter((id) => /^RL-[A-Z]{3}-\d{4,}$/.test(id))
    .slice(0, 3);
  const items = await getShopItemsByIds(ids);
  return (
    <Container className="py-10 sm:py-14">
      <Eyebrow>Shop</Eyebrow>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Compare items</h1>
      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing to compare yet"
            description="Open an item in the shop and press Compare. You can compare up to three."
            actions={<ButtonLink href="/shop">Browse the shop</ButtonLink>}
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">The items side by side</caption>
            <thead>
              <tr>
                <th scope="col" className="w-40 p-3">
                  <span className="sr-only">Detail</span>
                </th>
                {items.map((i) => (
                  <th key={i.id} scope="col" className="p-3 align-top font-normal">
                    <ItemVisual
                      category={i.category}
                      partType={i.partType}
                      grade={i.grade}
                      photo={i.photo}
                      alt=""
                      className="h-28 rounded-lg"
                    />
                    <Link
                      href={`/shop/${i.id}`}
                      className="mt-2 block font-semibold text-ink underline"
                    >
                      {i.title}
                    </Link>
                    <span className="mt-1 flex items-center gap-2 font-mono text-xs text-muted">
                      {i.id} <GradeBadge grade={i.grade} size="sm" withLabel={false} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <th scope="row" className="p-3 font-medium text-muted">
                    {r.label}
                  </th>
                  {items.map((i) => (
                    <td key={i.id} className="p-3 tabular-nums">
                      {r.value(i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ids.length > items.length && items.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          Some items in the link aren&apos;t on sale any more.
        </p>
      )}
    </Container>
  );
}
