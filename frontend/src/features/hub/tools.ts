import {
  BadgeCheck,
  ChartColumn,
  ClipboardList,
  Database,
  History,
  House,
  Inbox,
  Link2,
  PackageOpen,
  PackagePlus,
  Gauge,
  Scale,
  Route,
  Wrench,
  Truck,
  Recycle,
  Settings,
  ShieldCheck,
  Tags,
  Store,
  UserCog,
  Users,
  UserX,
  type LucideIcon,
} from "lucide-react";

/** Counts from public.hub_badges(); pending_shops is null for non-admins. */
export type HubBadges = {
  new_requests: number;
  new_reservations: number;
  new_institution_pickups: number;
  new_questions: number;
  new_submissions: number;
  offers_waiting: number;
  offers_accepted: number;
  payouts_due: number;
  pickups_next: number;
  open_claims: number;
  pickups_unconfirmed: number;
  part_listings_waiting: number;
  part_sales_to_pay: number;
  bins_due: number;
  pending_shops: number | null;
  deletion_requests: number | null;
};
export type BadgeKey =
  | "new_requests"
  | "new_submissions"
  | "offers_accepted"
  | "open_claims"
  | "part_listings_waiting"
  | "part_sales_to_pay"
  | "bins_due"
  | "pending_shops"
  | "deletion_requests";

export type HubTool = {
  href: string;
  label: string;
  /** One line for the account page cards. */
  description: string;
  icon: LucideIcon;
  /** Who may open it: hub staff (admins included) or admins only. */
  role: "staff" | "admin";
  group: "Daily work" | "Records" | "Admin";
  /** Counts shown on the menu entry (added together). */
  badge?: BadgeKey | BadgeKey[];
};

/** Every hub screen, in menu order. The menu, the account page and the overview all read this. */
export const HUB_TOOLS: readonly HubTool[] = [
  {
    href: "/hub",
    label: "Overview",
    description: "Today's to-dos: requests, submissions, stock rules and handovers.",
    icon: House,
    role: "staff",
    group: "Daily work",
  },
  {
    href: "/hub/intake",
    label: "Intake",
    description: "Log an item that arrived and give it its RL-JMU tag.",
    icon: PackagePlus,
    role: "staff",
    group: "Daily work",
  },
  {
    href: "/hub/items",
    label: "Items",
    description: "Grade, wipe, price, list and track every item.",
    icon: ClipboardList,
    role: "staff",
    group: "Daily work",
  },
  {
    href: "/hub/requests",
    label: "Requests",
    description: "Reservations, questions and institution pickups from the site.",
    icon: Inbox,
    role: "staff",
    group: "Daily work",
    badge: "new_requests",
  },
  {
    href: "/hub/submissions",
    label: "Shop submissions",
    description: "Review what partner shops offer, make offers and buy lots.",
    icon: PackageOpen,
    role: "staff",
    group: "Daily work",
    // New lots to review, and accepted ones to collect.
    badge: ["new_submissions", "offers_accepted"],
  },
  {
    href: "/hub/route",
    label: "Route",
    description: "Tuesday and Friday run sheets: stops in order, booked lots, collected or missed.",
    icon: Route,
    role: "staff",
    group: "Daily work",
  },
  {
    href: "/hub/repairs",
    label: "Repairs",
    description: "Items out with repair partners: fault, fee, days out, and back fixed or not.",
    icon: Wrench,
    role: "staff",
    group: "Daily work",
  },
  {
    href: "/hub/weighins",
    label: "Weigh-ins",
    description: "Weigh a shop's scrap, pay by the rate card, share the receipt.",
    icon: Scale,
    role: "staff",
    group: "Daily work",
  },
  {
    href: "/hub/capacity",
    label: "Capacity",
    description: "Scrap bins, battery cabinet, device racks, parts shelf and stock age.",
    icon: Gauge,
    role: "staff",
    group: "Daily work",
  },
  {
    href: "/hub/exchange",
    label: "Parts Exchange",
    description: "Receive, test and approve shops' part listings; pay their share.",
    icon: Store,
    role: "staff",
    group: "Daily work",
    badge: ["part_listings_waiting", "part_sales_to_pay"],
  },
  {
    href: "/hub/lots",
    label: "Institution lots",
    description: "Lot fees, equipment bought, and dead e-waste sent to VRRG Group.",
    icon: Truck,
    role: "staff",
    group: "Daily work",
  },
  {
    href: "/hub/warranty",
    label: "Warranty and returns",
    description: "Claims on grade A and B devices (30 days) and returns of parts (7 days).",
    icon: ShieldCheck,
    role: "staff",
    group: "Daily work",
    badge: "open_claims",
  },
  {
    href: "/hub/partners",
    label: "Shops & institutions",
    description: "The shops and institutions ReLoop buys from.",
    icon: Store,
    role: "staff",
    group: "Records",
  },
  {
    href: "/hub/handovers",
    label: "Handovers to VRRG Group",
    description: "Bins, batteries and the partner's weight receipts.",
    icon: Recycle,
    role: "staff",
    group: "Records",
    badge: "bins_due",
  },
  {
    href: "/hub/pricing/references",
    label: "Price references",
    description: "Used-market prices with their source and date, for the shop's fair-price bands.",
    icon: Tags,
    role: "staff",
    group: "Records",
  },
  {
    href: "/hub/kpis",
    label: "KPIs",
    description: "The business plan's targets, month by month, with CSV exports.",
    icon: ChartColumn,
    role: "staff",
    group: "Records",
  },
  {
    href: "/hub/data",
    label: "Data & exports",
    description: "Backups and the shop file.",
    icon: Database,
    role: "staff",
    group: "Records",
  },
  {
    href: "/hub/shops",
    label: "Shop verification",
    description: "Verify partner shop accounts and put consenting shops on the map.",
    icon: BadgeCheck,
    role: "admin",
    group: "Admin",
    badge: "pending_shops",
  },
  {
    href: "/hub/users",
    label: "Users",
    description: "Find accounts and reset a password after a phone check.",
    icon: Users,
    role: "admin",
    group: "Admin",
  },
  {
    href: "/hub/team",
    label: "Team",
    description: "Make someone hub staff or an admin, or remove them.",
    icon: UserCog,
    role: "admin",
    group: "Admin",
  },
  {
    href: "/hub/deletions",
    label: "Account deletions",
    description: "Carry out or decline requests to delete an account and its data.",
    icon: UserX,
    role: "admin",
    group: "Admin",
    badge: "deletion_requests",
  },
  {
    href: "/hub/links",
    label: "Links & QR codes",
    description: "Visits per short link and QR code, by day and week.",
    icon: Link2,
    role: "admin",
    group: "Admin",
  },
  {
    href: "/hub/audit",
    label: "Audit log",
    description: "Every password reset, role change and settings change.",
    icon: History,
    role: "admin",
    group: "Admin",
  },
  {
    href: "/hub/settings",
    label: "Settings",
    description: "Contact details, drop-off shops, accept lists and the hub's numbers.",
    icon: Settings,
    role: "admin",
    group: "Admin",
  },
];

export const TOOL_GROUPS = ["Daily work", "Records", "Admin"] as const;

/** The tools someone may open: admins get all, staff the staff ones, everyone else none. */
export function toolsFor(access: { is_staff: boolean; is_admin: boolean } | null) {
  if (!access?.is_staff && !access?.is_admin) return [];
  return HUB_TOOLS.filter((t) => t.role === "staff" || access.is_admin);
}

/** Whether a menu entry is the current page (the overview only on /hub itself). */
export const isToolActive = (href: string, pathname: string) =>
  href === "/hub" ? pathname === "/hub" : pathname === href || pathname.startsWith(`${href}/`);

/** A tool's badge count: the sum of its keys, or null when there is nothing to show. */
export function badgeCount(tool: Pick<HubTool, "badge">, badges: HubBadges | null): number | null {
  if (!tool.badge || !badges) return null;
  const keys = Array.isArray(tool.badge) ? tool.badge : [tool.badge];
  const n = keys.reduce((sum, k) => sum + (badges[k] ?? 0), 0);
  return n || null;
}
