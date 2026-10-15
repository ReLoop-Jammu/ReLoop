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
        href: "/how-we-price",
        label: "How we price",
        description: "Fair-price ranges, savings against new, price cuts",
      },
      {
        href: "/warranty",
        label: "Warranty & returns",
        description: "30 days on devices, 7 days on parts",
      },
      {
        href: "/account/saved",
        label: "Saved items",
        description: "Items you're watching, with price-drop alerts",
      },
    ],
  },
  {
    key: "sell",
    label: "For shops & institutions",
    links: [
      {
        href: "/sell",
        label: "For shops & institutions",
        description: "How selling to ReLoop works and how we pay",
      },
      {
        href: "/sell/shops",
        label: "Repair shops & retailers",
        description: "A fixed weekly pickup, paid by UPI on the spot",
      },
      {
        href: "/rate-card",
        label: "Rate card",
        description: "What we pay per kilo of scrap",
      },
      {
        href: "/partners",
        label: "Partner shops",
        description: "Jammu shops in the loop, listed with their agreement",
      },
      {
        href: "/sell/institutions",
        label: "Colleges, schools & offices",
        description: "Booked lot pickups with a handover record",
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
        href: "/network",
        label: "The network",
        description: "Where scrap comes from and where it goes",
      },
      {
        href: "/ledger",
        label: "Handover ledger",
        description: "Every handover to VRRG Group, in kg",
      },
      {
        href: "/reports",
        label: "Monthly reports",
        description: "Each month of the pilot in numbers",
      },
      { href: "/data", label: "Open data", description: "The public figures as CSV files" },
      {
        href: "/where-scrap-goes",
        label: "Where scrap goes",
        description: "VRRG Group, our dismantling partner, and our rules",
      },
    ],
  },
  {
    key: "about",
    label: "About",
    links: [
      {
        href: "/about",
        label: "About ReLoop",
        description: "Who we are, and how to help build the loop",
      },
      {
        href: "/how-it-works",
        label: "How it works",
        description: "Collect, weigh, grade, resell, hand over",
      },
      {
        href: "/standards",
        label: "Our standards",
        description: "Grading, data wipe, pricing and more",
      },
      {
        href: "/compliance",
        label: "Compliance & partners",
        description: "The E-Waste Rules in plain words, and VRRG Group",
      },
      {
        href: "/faq",
        label: "Questions & answers",
        description: "Short answers to common questions",
      },
      {
        href: "/locations",
        label: "Map & locations",
        description: "The hub, the weekly routes and VRRG Group",
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
      { href: "/print", label: "Counter card and flyer" },
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
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

export const allNavLinks = () => NAV_GROUPS.flatMap((g) => g.links);
export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
