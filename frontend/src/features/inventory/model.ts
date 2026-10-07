/*
 * Inventory domain model, following the Business Plan: ReLoop buys items,
 * tags each one (RL-JMU-0001), grades it A–D at the hub, then resells,
 * repairs, strips for parts or hands it to an authorised recycler.
 * Money is integer paise; dates are ISO strings.
 */

export const GRADES = ["A", "B", "C", "D"] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_INFO: Record<
  Grade,
  { label: string; short: string; outcome: string; description: string }
> = {
  A: {
    label: "Grade A",
    short: "Works, clean",
    outcome: "Resold as is",
    description: "Powers on and passes every check on our test list. Cleaned and photographed.",
  },
  B: {
    label: "Grade B",
    short: "Repaired",
    outcome: "Repaired, then resold",
    description:
      "Had one fixable fault — screen, battery, port or keyboard — repaired by a partner shop, then re-tested.",
  },
  C: {
    label: "Grade C",
    short: "Tested part",
    outcome: "Stripped for parts",
    description:
      "Not worth repairing as a whole, so its good parts are removed, tested and sold separately.",
  },
  D: {
    label: "Grade D",
    short: "Recycled",
    outcome: "Sent to an authorised recycler",
    description:
      "Dead or hazardous. Bagged, weighed and handed to an authorised recycler. Never sold.",
  },
};

export const CATEGORIES = [
  { value: "phone", label: "Phones", single: "Phone" },
  { value: "laptop", label: "Laptops", single: "Laptop" },
  { value: "desktop", label: "Desktops", single: "Desktop" },
  { value: "monitor", label: "Monitors", single: "Monitor" },
  { value: "tv", label: "TVs", single: "TV" },
  { value: "printer", label: "Printers", single: "Printer" },
  { value: "ups", label: "UPS units", single: "UPS" },
  { value: "small_appliance", label: "Small appliances", single: "Small appliance" },
  { value: "accessory", label: "Accessories", single: "Accessory" },
  { value: "part", label: "Parts", single: "Part" },
] as const;
export type Category = (typeof CATEGORIES)[number]["value"];

export const PART_TYPES = [
  { value: "screen", label: "Screen" },
  { value: "board", label: "Board" },
  { value: "ram", label: "RAM" },
  { value: "storage", label: "Storage drive" },
  { value: "battery", label: "Battery" },
  { value: "charger", label: "Charger / power supply" },
  { value: "motor", label: "Motor" },
  { value: "other", label: "Other part" },
] as const;
export type PartType = (typeof PART_TYPES)[number]["value"];

export const SOURCE_TYPES = [
  { value: "repair_shop", label: "Repair shop" },
  { value: "retailer", label: "Electronics retailer" },
  { value: "institution", label: "Institution" },
  { value: "household", label: "Household" },
  { value: "stripped", label: "Stripped from a C item" },
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number]["value"];

export const STATUSES = [
  { value: "received", label: "Received", stage: "intake" },
  { value: "graded", label: "Graded", stage: "intake" },
  { value: "out_for_repair", label: "Out for repair", stage: "work" },
  { value: "stripping", label: "Stripping for parts", stage: "work" },
  { value: "listed", label: "Listed", stage: "selling" },
  { value: "reserved", label: "Reserved", stage: "selling" },
  { value: "sold", label: "Sold", stage: "done" },
  { value: "in_scrap_cage", label: "In scrap cage", stage: "recycling" },
  { value: "handed_over", label: "Handed to recycler", stage: "done" },
  { value: "stripped", label: "Stripped (parts removed)", stage: "done" },
] as const;
export type ItemStatus = (typeof STATUSES)[number]["value"];

export type BuyMode = "cash" | "consignment" | "free";
export type Fulfilment = "pickup" | "delivery_jammu" | "ship_india";
export type WipeMethod = "reset_overwrite" | "drive_wipe" | "drilled";

export type ItemEvent = { at: string; type: string; note?: string };

export type Item = {
  id: string;
  receivedAt: string;
  source: { type: SourceType; partnerId?: string; institutionId?: string; name?: string };
  category: Category;
  partType?: PartType;
  brand: string;
  model: string;
  description: string;
  /** Compressed data URLs today; storage paths once a backend exists. */
  photos: string[];
  weightKg?: number;
  hasBattery: boolean;
  grade: Grade | null;
  gradedAt?: string;
  checklist: Record<string, boolean>;
  faults: string;
  dataWipe: { required: boolean; method?: WipeMethod; doneAt?: string };
  rack: string;
  buyMode: BuyMode;
  buyPaise: number;
  expectedResalePaise: number | null;
  listPaise: number | null;
  currentPaise: number | null;
  priceCutAt?: string;
  status: ItemStatus;
  listedAt?: string;
  soldAt?: string;
  soldPaise?: number;
  fulfilment?: Fulfilment;
  parentId?: string;
  consignmentId?: string;
  handoverId?: string;
  events: ItemEvent[];
};

export type Partner = {
  id: string;
  type: "repair_shop" | "retailer";
  name: string;
  owner: string;
  phone: string;
  market: string;
  routeDay: "tue" | "fri" | "";
  isRepairPartner: boolean;
  status: "lead" | "active" | "paused";
  joinedAt: string;
  notes: string;
};

export type Institution = {
  id: string;
  name: string;
  type: "college" | "school" | "bank" | "office" | "other";
  contactName: string;
  phone: string;
  email: string;
  isAnchor: boolean;
  notes: string;
};

export type Handover = {
  id: string;
  date: string;
  recycler: string;
  onBehalfOf?: string;
  /** Kilograms per item category, plus "unweighed" for weight on the receipt not matched to items. */
  kgByCategory: Record<string, number>;
  batteryKg: number;
  itemIds: string[];
  receiptNo: string;
  ratePerKgPaise?: number;
  amountPaise?: number;
  notes: string;
};

export type RepairJob = {
  id: string;
  itemId: string;
  partnerId: string;
  fault: string;
  feePaise: number;
  sentAt: string;
  returnedAt?: string;
  outcome?: "fixed" | "not_fixable";
};

export type Consignment = {
  id: string;
  itemId: string;
  consignorName: string;
  phone: string;
  agreedPaise: number;
  sellerShare: number;
  startedAt: string;
  status: "active" | "sold" | "payout_due" | "paid" | "returned";
  payoutPaise?: number;
};

/** Requests sent through the public "Sell to us" forms. */
export type Submission = {
  id: string;
  kind: "shop_partner" | "institution_pickup" | "household_dropoff" | "consignment" | "reservation";
  createdAt: string;
  fields: Record<string, string>;
  status: "new" | "contacted" | "done";
};

export function categoryLabel(value: Category, plural = false): string {
  const c = CATEGORIES.find((x) => x.value === value);
  return c ? (plural ? c.label : c.single) : value;
}

export function statusLabel(value: ItemStatus): string {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function isSellable(grade: Grade | null): grade is "A" | "B" | "C" {
  return grade === "A" || grade === "B" || grade === "C";
}

/** Only laptops and boards are worth shipping across India (buyer pays). */
export function shipsAcrossIndia(item: Pick<Item, "category" | "partType">): boolean {
  return item.category === "laptop" || (item.category === "part" && item.partType === "board");
}

/** Phones, laptops, desktops and drives must be wiped before listing. */
export function needsDataWipe(item: Pick<Item, "category" | "partType">): boolean {
  return (
    item.category === "phone" ||
    item.category === "laptop" ||
    item.category === "desktop" ||
    (item.category === "part" && item.partType === "storage")
  );
}
