import type { Institution, Item, Partner } from "@/features/inventory/model";

export type SearchHit = {
  kind: "item" | "partner" | "institution";
  id: string;
  title: string;
  detail: string;
  href: string;
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Items by tag (a bare number finds RL-JMU-0042 too), brand or model, and
 * partner shops and institutions by name or market. At most `limit` of each.
 * Contact names and phone numbers are not searched, so results never hint
 * at them.
 */
export function searchHub(
  query: string,
  data: {
    items: readonly Item[];
    partners: readonly Partner[];
    institutions: readonly Institution[];
  },
  limit = 20,
): SearchHit[] {
  const q = norm(query);
  if (q.length < 2 && !/^\d+$/.test(q)) return [];
  const tagNumber = /^(?:rl-jmu-)?0*(\d{1,6})$/.exec(q)?.[1];
  const items = data.items
    .filter((i) => {
      // A tag or bare number matches that one tag, not every tag containing the digits.
      if (tagNumber) return i.id.toLowerCase().replace(/^rl-[a-z]{3}-0*/, "") === tagNumber;
      return norm(`${i.id} ${i.brand} ${i.model}`).includes(q);
    })
    .slice(0, limit)
    .map<SearchHit>((i) => ({
      kind: "item",
      id: i.id,
      title: i.id,
      detail: [i.brand, i.model].filter(Boolean).join(" ") || i.category,
      href: `/hub/items/${i.id}`,
    }));
  const partners = data.partners
    .filter((p) => norm(`${p.name} ${p.market}`).includes(q))
    .slice(0, limit)
    .map<SearchHit>((p) => ({
      kind: "partner",
      id: p.id,
      title: p.name,
      detail: p.market || (p.type === "retailer" ? "Retailer" : "Repair shop"),
      href: "/hub/partners",
    }));
  const institutions = data.institutions
    .filter((x) => norm(x.name).includes(q))
    .slice(0, limit)
    .map<SearchHit>((x) => ({
      kind: "institution",
      id: x.id,
      title: x.name,
      detail: x.type[0].toUpperCase() + x.type.slice(1),
      href: "/hub/partners",
    }));
  return [...items, ...partners, ...institutions];
}
