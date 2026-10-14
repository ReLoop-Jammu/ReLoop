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
  Recycle,
  Settings,
  Store,
  UserCog,
  Users,
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
  pending_shops: number | null;
};
export type BadgeKey = "new_requests" | "new_submissions" | "pending_shops";

export type HubTool = {
  href: string;
  label: string;
  /** One line for the account page cards. */
  description: string;
  icon: LucideIcon;
  /** Who may open it: hub staff (admins included) or admins only. */
  role: "staff" | "admin";
  group: "Daily work" | "Records" | "Admin";
  badge?: BadgeKey;
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
    badge: "new_submissions",
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
    label: "Recycler handovers",
    description: "Scrap and battery handovers, with the recycler's receipt.",
    icon: Recycle,
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
