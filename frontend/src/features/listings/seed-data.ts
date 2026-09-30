import type { Listing } from "./model";

/*
 * Sample inventory carried over from the original prototype. Used until
 * Phase 3, when the same rows move into supabase/seed.sql.
 */
const RELOOP = { kind: "reloop", name: "ReLoop Jammu" } as const;

type SeedRow = Omit<Listing, "id" | "slug" | "seller" | "publishedAt" | "city"> & {
  slug: string;
};

const rows: SeedRow[] = [
  {
    slug: "lenovo-thinkpad-t480",
    title: "Lenovo ThinkPad T480",
    category: "devices",
    condition: "working",
    pricePaise: 1_450_000,
    quantity: 1,
    icon: "laptop",
    description: "Used business laptop. Listing shown as sample data.",
  },
  {
    slug: "ddr4-8gb-laptop-ram",
    title: "DDR4 8GB Laptop RAM",
    category: "components",
    condition: "tested",
    pricePaise: 95_000,
    quantity: 8,
    icon: "memory",
    description: "Tested memory modules, sample lot.",
  },
  {
    slug: "hp-laptop-for-repair",
    title: "HP Laptop — for repair",
    category: "repairable",
    condition: "repairable",
    pricePaise: 320_000,
    quantity: 1,
    icon: "wrench",
    description: "Powers on intermittently. For repair or parts.",
  },
  {
    slug: "mixed-desktop-components-lot",
    title: "Mixed desktop components (lot)",
    category: "bulk_lots",
    condition: "parts_only",
    pricePaise: 850_000,
    quantity: 1,
    icon: "boxes",
    description: "Illustrative bulk lot; exact inventory to be verified.",
  },
  {
    slug: "refurbished-240gb-sata-ssd",
    title: "Refurbished 240GB SATA SSD",
    category: "components",
    condition: "tested",
    pricePaise: 125_000,
    quantity: 5,
    icon: "drive",
    description: "Sample listing; testing report should be provided in production.",
  },
  {
    slug: "end-of-life-electronics-pickup-lot",
    title: "End-of-life electronics pickup lot",
    category: "recycling",
    condition: "end_of_life",
    pricePaise: null,
    quantity: 1,
    icon: "recycle",
    description:
      "Demo only. Real end-of-life material must go through compliant authorised channels.",
  },
  {
    slug: "dell-22-inch-monitor",
    title: "Dell 22-inch Monitor",
    category: "devices",
    condition: "working",
    pricePaise: 280_000,
    quantity: 1,
    icon: "monitor",
    description: "Working monitor, local pickup preferred.",
  },
  {
    slug: "laptop-screens-assorted-lot",
    title: "Laptop screens — assorted lot",
    category: "bulk_lots",
    condition: "parts_only",
    pricePaise: 600_000,
    quantity: 10,
    icon: "wrench",
    description: "Assorted screens; compatibility and condition must be confirmed.",
  },
  {
    slug: "logitech-usb-keyboard",
    title: "Logitech USB Keyboard",
    category: "devices",
    condition: "working",
    pricePaise: 45_000,
    quantity: 2,
    icon: "keyboard",
    description: "Clean USB keyboard, tested keys.",
  },
  {
    slug: "laptop-battery-pack-tested",
    title: "Laptop battery pack — tested",
    category: "components",
    condition: "tested",
    pricePaise: 110_000,
    quantity: 4,
    icon: "battery",
    description: "Tested battery packs; compatibility varies by model.",
  },
  {
    slug: "desktop-tower-for-refurbishment",
    title: "Desktop tower for refurbishment",
    category: "repairable",
    condition: "repairable",
    pricePaise: 240_000,
    quantity: 1,
    icon: "monitor",
    description: "Needs storage replacement; suitable for refurbishment.",
  },
  {
    slug: "mixed-cables-and-adapters-lot",
    title: "Mixed cables and adapters lot",
    category: "bulk_lots",
    condition: "parts_only",
    pricePaise: 180_000,
    quantity: 25,
    icon: "cable",
    description: "Mixed power and data cables, sold as one lot.",
  },
  {
    slug: "working-android-smartphone",
    title: "Working Android smartphone",
    category: "devices",
    condition: "working",
    pricePaise: 520_000,
    quantity: 1,
    icon: "smartphone",
    description: "Demo listing. Check battery health and device status before purchase.",
  },
  {
    slug: "ddr3-ram-modules-bulk",
    title: "DDR3 RAM modules — bulk",
    category: "components",
    condition: "tested",
    pricePaise: 70_000,
    quantity: 12,
    icon: "memory",
    description: "Tested modules for compatible older systems.",
  },
  {
    slug: "printer-for-parts",
    title: "Printer for parts",
    category: "repairable",
    condition: "parts_only",
    pricePaise: 65_000,
    quantity: 1,
    icon: "printer",
    description: "Not printing; offered for repair or component recovery.",
  },
  {
    slug: "office-it-clearance-mixed-lot",
    title: "Office IT clearance — mixed lot",
    category: "bulk_lots",
    condition: "repairable",
    pricePaise: 1_850_000,
    quantity: 1,
    icon: "boxes",
    description: "Illustrative institutional lot; inventory and condition require inspection.",
  },
];

// Stable, deterministic dates so builds are reproducible: newest first.
const BASE_DATE = Date.UTC(2026, 8, 1);
const DAY = 86_400_000;

export const SEED_LISTINGS: readonly Listing[] = rows.map((row, index) => ({
  ...row,
  id: String(index + 1),
  city: "Jammu, J&K",
  seller: RELOOP,
  publishedAt: new Date(BASE_DATE - index * DAY).toISOString(),
}));
