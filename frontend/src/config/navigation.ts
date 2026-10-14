/**
 * The site's information architecture: one source for the header menus, the
 * mobile menu, the footer sitemap and sitemap.xml. A page is listed here only
 * once it exists, so no menu ever links to a missing page.
 */
export type NavLink = { href: string; label: string; description?: string };
export type NavGroup = { key: string; label: string; links: NavLink[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "buy",
    label: "Buy",
    links: [
      { href: "/shop", label: "Shop", description: "Tested, graded and data-wiped electronics" },
      {
        href: "/warranty",
        label: "Warranty & delivery",
        description: "30 days on grade A and B devices",
      },
    ],
  },
  {
    key: "sell",
    label: "Sell",
    links: [
      { href: "/sell", label: "Sell to ReLoop", description: "How selling works and what we pay" },
      {
        href: "/sell/shops",
        label: "Repair shops & retailers",
        description: "Cash on pickup, Tuesday and Friday",
      },
      {
        href: "/sell/institutions",
        label: "Colleges & offices",
        description: "Booked pickups for bulk lots",
      },
      {
        href: "/what-we-accept",
        label: "What we accept",
        description: "What we take, what we don't, and batteries",
      },
      {
        href: "/help",
        label: "Help for partner shops",
        description: "Step by step, in English and Hindi",
      },
    ],
  },
  {
    key: "transparency",
    label: "Transparency",
    links: [
      { href: "/impact", label: "Our impact", description: "What the loop has kept in use" },
      {
        href: "/where-scrap-goes",
        label: "Where scrap goes",
        description: "The authorised recycler and our rules",
      },
    ],
  },
  {
    key: "about",
    label: "About",
    links: [
      {
        href: "/how-it-works",
        label: "How it works",
        description: "Collect, grade, resell, recycle",
      },
      {
        href: "/locations",
        label: "Map & locations",
        description: "The hub area, route and recycler",
      },
      {
        href: "/contact",
        label: "Contact",
        description: "WhatsApp, email and the grievance officer",
      },
    ],
  },
];

/** Footer-only groups: resources and the legal pages. */
export const FOOTER_EXTRA: NavGroup[] = [
  {
    key: "partners",
    label: "For partners",
    links: [
      { href: "/print", label: "Posters and flyers" },
      { href: "/locations/qr", label: "Awareness-drive QR code" },
      { href: "/register", label: "Create an account" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    key: "legal",
    label: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
];

export const allNavLinks = () => NAV_GROUPS.flatMap((g) => g.links);
export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
