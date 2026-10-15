/** A stage of an item's public journey, as item_passport gives it. */
export type PassportRow = {
  item_id: string;
  category: string;
  part_type: string | null;
  stage: string;
  at: string;
};

export const STAGE_LABEL: Record<string, { title: string; detail: string }> = {
  received: { title: "Received at the hub", detail: "Bought by ReLoop and given this tag." },
  graded: { title: "Graded", detail: "Tested and graded at the hub." },
  inspected: {
    title: "Inspected (ReLoop Checked)",
    detail: "Every check recorded, and a grade given.",
  },
  data_wiped: { title: "Personal data wiped", detail: "Wiped before it could go to anyone else." },
  sent_for_repair: { title: "Sent for repair", detail: "To a partner repair shop in Jammu." },
  listed: { title: "Listed for sale", detail: "On sale in the ReLoop shop." },
  price_changed: { title: "Price changed", detail: "Its price was updated." },
  reserved: { title: "Reserved", detail: "Held for a buyer." },
  sold: { title: "Sold", detail: "Found its next owner." },
  returned: { title: "Returned", detail: "Came back to the hub after the sale." },
  stripped_for_parts: {
    title: "Stripped for parts",
    detail: "Its working parts were removed to be reused.",
  },
  to_recycling: {
    title: "To the D devices bin",
    detail: "Not worth repairing: set aside to be handed to VRRG Group by weight.",
  },
  recycled: {
    title: "Handed to VRRG Group",
    detail: "Handed to our dismantling partner, VRRG Group, by weight.",
  },
};

/** The stages in date order; the same moment keeps the natural order of the journey. */
const ORDER = Object.keys(STAGE_LABEL);
export function journey(rows: readonly PassportRow[]): PassportRow[] {
  return [...rows].sort(
    (a, b) => a.at.localeCompare(b.at) || ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage),
  );
}

/** Where the item is now, in a few words. */
export function whereNow(rows: readonly PassportRow[]): string {
  const last = journey(rows).at(-1)?.stage;
  switch (last) {
    case "listed":
    case "price_changed":
      return "On sale";
    case "reserved":
      return "Reserved for a buyer";
    case "sold":
      return "With its new owner";
    case "recycled":
      return "Handed to VRRG Group";
    case "to_recycling":
      return "Waiting to be handed to VRRG Group";
    case "stripped_for_parts":
      return "Its parts are being reused";
    case "sent_for_repair":
      return "Being repaired";
    default:
      return "At the hub";
  }
}
