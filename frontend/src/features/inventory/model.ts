/*
 * Inventory domain model, following Business Plan v2: ReLoop buys devices and
 * parts, tags each one (RL-JMU-0001), grades devices A–D at the hub, then
 * resells, repairs or strips them for parts. Scrap is weighed by category and
 * handed to the dismantling partner, VRRG Group, Gangyal.
 * Money is integer paise; dates are ISO strings.
 */

import type { Inspection } from "./inspection";

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
      "Not worth repairing as a whole, so its good parts are removed, tested and sold separately as tested parts.",
  },
  D: {
    label: "Grade D",
    short: "Dead, by weight",
    outcome: "Handed to VRRG Group by weight",
    description:
      "Dead or hazardous: not resold for use. Its storage is wiped or destroyed, then it goes into a scrap bin and is handed to VRRG Group, our dismantling partner, by weight.",
  },
};

export const CATEGORIES = [
  { value: "phone", label: "Phones", single: "Phone" },
  { value: "laptop", label: "Laptops", single: "Laptop" },
  { value: "desktop", label: "Desktops", single: "Desktop" },
  { value: "monitor", label: "Monitors", single: "Monitor" },
  { value: "accessory", label: "Accessories", single: "Accessory" },
  { value: "part", label: "Parts", single: "Part" },
  // No longer taken (Business Plan v2). Old rows keep their labels; new rows can't use them.
  { value: "tv", label: "TVs", single: "TV", retired: true },
  { value: "printer", label: "Printers", single: "Printer", retired: true },
  { value: "ups", label: "UPS units", single: "UPS", retired: true },
  { value: "small_appliance", label: "Small appliances", single: "Small appliance", retired: true },
] as const;
export type Category = (typeof CATEGORIES)[number]["value"];
/** The categories ReLoop takes now: what forms, filters and settings offer. */
export const ACTIVE_CATEGORIES = CATEGORIES.filter(
  (c) => !("retired" in c && c.retired),
) as readonly (typeof CATEGORIES)[number][];
export const RETIRED_CATEGORY_VALUES = CATEGORIES.filter((c) => "retired" in c && c.retired).map(
  (c) => c.value,
) as readonly Category[];
export const isRetiredCategory = (value: string): boolean =>
  (RETIRED_CATEGORY_VALUES as readonly string[]).includes(value);

export const PART_TYPES = [
  { value: "screen", label: "Screen" },
  { value: "board", label: "Board" },
  { value: "ram", label: "RAM" },
  { value: "storage", label: "Storage drive" },
  { value: "battery", label: "Battery" },
  { value: "charger", label: "Charger / power supply" },
  { value: "motor", label: "Phone or laptop motor" },
  { value: "camera", label: "Camera" },
  { value: "charging_port", label: "Charging port" },
  { value: "other", label: "Other phone or laptop part" },
] as const;
export type PartType = (typeof PART_TYPES)[number]["value"];

export const SOURCE_TYPES = [
  { value: "repair_shop", label: "Repair shop" },
  { value: "retailer", label: "Retailer or exchange store" },
  { value: "institution", label: "Institution" },
  { value: "partner_listing", label: "Listed by a partner shop" },
  { value: "stripped", label: "Stripped from a C item" },
  // No longer used (Business Plan v2): old rows keep the label.
  { value: "household", label: "Household (no longer taken)", retired: true },
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number]["value"];
/** Sources staff can pick at intake. */
export const INTAKE_SOURCE_TYPES = SOURCE_TYPES.filter(
  (s) => s.value === "repair_shop" || s.value === "retailer" || s.value === "institution",
);

export const STATUSES = [
  { value: "received", label: "Received", stage: "intake" },
  { value: "graded", label: "Graded", stage: "intake" },
  { value: "out_for_repair", label: "Out for repair", stage: "work" },
  { value: "stripping", label: "Stripping for parts", stage: "work" },
  { value: "listed", label: "Listed", stage: "selling" },
  { value: "reserved", label: "Reserved", stage: "selling" },
  { value: "sold", label: "Sold", stage: "done" },
  { value: "returned", label: "Returned by the buyer", stage: "work" },
  { value: "in_scrap_cage", label: "In the D devices bin", stage: "recycling" },
  { value: "handed_over", label: "Handed to VRRG Group", stage: "done" },
  { value: "stripped", label: "Stripped (parts removed)", stage: "done" },
] as const;
export type ItemStatus = (typeof STATUSES)[number]["value"];

export type BuyMode = "cash" | "free";
/** "ship_india" is kept only so old sales still display; nothing is shipped outside Jammu. */
export type Fulfilment = "pickup" | "delivery_jammu" | "ship_india";
export type WipeMethod = "reset_overwrite" | "drive_wipe" | "drilled";

export type ItemEvent = { at: string; type: string; note?: string };

export type Item = {
  id: string;
  receivedAt: string;
  source: {
    type: SourceType;
    partnerId?: string;
    institutionId?: string;
    name?: string;
    contactName?: string;
    phone?: string;
  };
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
  purchasePaymentMethod?: "cash" | "upi" | "bank_transfer" | "other" | "not_paid";
  purchaseReference?: string;
  purchasePaidAt?: string;
  expectedResalePaise: number | null;
  listPaise: number | null;
  currentPaise: number | null;
  priceCutAt?: string;
  status: ItemStatus;
  listedAt?: string;
  soldAt?: string;
  soldPaise?: number;
  /** Where the buyer is (a locality from the buyer-areas list), recorded by staff after a sale. */
  buyerArea?: string;
  fulfilment?: Fulfilment;
  parentId?: string;
  handoverId?: string;
  /** The price of this item new, where staff found one (shown as "about ₹X less than new"). */
  newPricePaise?: number;
  newPriceSource?: string;
  newPriceCheckedOn?: string;
  /** The ReLoop Checked record; required before the item goes on sale. */
  inspection?: Inspection;
  inspectedAt?: string;
  /** Kept off the public shop and every public page, whatever the status. */
  hidden?: boolean;
  returnedAt?: string;
  /** When the seller confirmed they own the device (or have it signed over). */
  ownershipConfirmedAt?: string;
  /** A locked device is only ever C or D, never resold whole. */
  lockedDevice?: boolean;
  /** Set on a part a partner shop listed on the Parts Exchange (commission applies). */
  listedByPartnerId?: string;
  commissionPct?: number;
  /** The weigh-in whose to-test bag this part came from. */
  weighinId?: string;
  events: ItemEvent[];
};

export type Partner = {
  id: string;
  type: "repair_shop" | "retailer";
  /** "Exchange store" for a retailer that mainly takes trade-ins. */
  label?: string;
  /** The partner's shop-owner account, if it has one (needed to list parts). */
  shopOwnerId?: string;
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
  /** Kilograms per bin (screens, boards, other, d_devices); old rows use item categories ("before bins"). */
  kgByCategory: Record<string, number>;
  kind?: "hub" | "institution_lot";
  bins?: string[];
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

/** Requests sent through the public "Sell to us" forms. */
export type Submission = {
  id: string;
  /** "household_dropoff" and "consignment" are old requests only; new ones are refused. */
  kind:
    | "shop_partner"
    | "institution_pickup"
    | "household_dropoff"
    | "consignment"
    | "reservation"
    | "enquiry";
  createdAt: string;
  fields: Record<string, string>;
  /** Reservations and enquiries are about one item. */
  itemId?: string;
  status: "new" | "contacted" | "scheduled" | "collected" | "done" | "sold" | "cancelled";
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

/**
 * Phones, laptops, desktops, drives and boards (except a monitor's) are wiped, or
 * their storage destroyed, before they are stripped or sold.
 */
export function needsDataWipe(
  item: Pick<Item, "category" | "partType"> & { parentCategory?: Category },
): boolean {
  return (
    item.category === "phone" ||
    item.category === "laptop" ||
    item.category === "desktop" ||
    (item.category === "part" && item.partType === "storage") ||
    (item.category === "part" && item.partType === "board" && item.parentCategory !== "monitor")
  );
}
