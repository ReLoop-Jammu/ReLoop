/** A handover record for an institution's lot, as handover_record() returns it (no prices). */
export type HandoverRecord = {
  institution: string;
  lot_date: string;
  bought_items: {
    tag: string;
    category: string;
    brand: string;
    model: string;
    grade: string | null;
  }[];
  dismantler: string | null;
  dismantler_receipt_no: string | null;
  dismantler_date: string | null;
  kg_by_category: Record<string, number | string>;
};

export const KG_LABEL: Record<string, string> = {
  screens: "Screens",
  boards: "Boards",
  other: "Everything else",
  d_devices: "D devices",
  batteries: "Batteries",
};

const date = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/** The sentences of the record, in order. Pure, so the wording can be tested. */
export function recordText(r: HandoverRecord) {
  const kg = Object.entries(r.kg_by_category)
    .map(([k, v]) => ({ label: KG_LABEL[k] ?? k, kg: Number(v) }))
    .filter((x) => x.kg > 0);
  const total = Math.round(kg.reduce((s, x) => s + x.kg, 0) * 10) / 10;
  return {
    title: "Handover record",
    intro: `This record lists what ReLoop bought from ${r.institution} in the lot of ${date(r.lot_date)}, and what was handed to our licensed recycler as dead electronic waste.`,
    bought: r.bought_items.map(
      (i) =>
        `${i.tag}: ${[i.brand, i.model].filter(Boolean).join(" ") || i.category}${i.grade ? `, grade ${i.grade}` : ""}`,
    ),
    boughtNone: "No items from this lot were kept for resale or parts.",
    handedOver: r.dismantler
      ? `${r.dismantler} weighed the dead electronic waste on ${r.dismantler_date ? date(r.dismantler_date) : "the day of handover"}, on their weight receipt ${r.dismantler_receipt_no}, in the name of ${r.institution}.`
      : "The dead electronic waste from this lot has not been handed over yet.",
    kg: kg.map((x) => `${x.label}: ${x.kg.toFixed(1)} kg`),
    total: kg.length ? `Total weighed: ${total.toFixed(1)} kg` : "",
    footer:
      "Equipment is paid for on its own receipt, and ReLoop's lot fee on another. This record states weights and tags only.",
  };
}
