export type ImpactTotals = {
  itemsReused: number;
  kgRecycled: number;
  activePartnerShops: number;
};

type Row = {
  items_reused: number | string;
  kg_recycled: number | string;
  active_partner_shops: number | string;
};

export function parseImpactRow(row: Row | undefined): ImpactTotals | null {
  if (!row) return null;
  const t = {
    itemsReused: Number(row.items_reused),
    kgRecycled: Number(row.kg_recycled),
    activePartnerShops: Number(row.active_partner_shops),
  };
  return Object.values(t).every((n) => Number.isFinite(n) && n >= 0) ? t : null;
}

/** Show the numbers only once at least one of them is above zero. */
export const showImpactNumbers = (t: ImpactTotals | null): t is ImpactTotals =>
  !!t && (t.itemsReused > 0 || t.kgRecycled > 0 || t.activePartnerShops > 0);

export const formatKg = (kg: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: kg < 100 ? 1 : 0 }).format(kg);
