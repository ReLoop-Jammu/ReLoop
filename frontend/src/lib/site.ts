/**
 * Business details shown across the site (footer, contact, legal pages,
 * structured data). Fill in the `null` values once the team confirms them —
 * see docs/team-setup.md. Anything left `null` is hidden or shown as
 * "coming soon" rather than displaying a placeholder.
 */
const SUPPORT_EMAIL = "noice2709@gmail.com";
const PUBLIC_PHONE = "+91 98712 76179";

export const SITE = {
  name: "ReLoop Jammu",
  shortName: "ReLoop",
  tagline: "Jammu's local loop for used electronics",
  description:
    "ReLoop buys used and broken electronics from Jammu's repair shops, retailers and institutions, tests and grades them at one hub, resells what still works and hands scrap to VRRG Group, our dismantling partner.",
  city: "Jammu, Jammu & Kashmir, India",
  /** Registered legal name of the business or organisation. */
  legalName: null as string | null,
  /** Registered postal address. */
  address: null as string | null,
  supportEmail: SUPPORT_EMAIL as string | null,
  /** WhatsApp number in international format without "+" or spaces, e.g. "919876543210". Sell-to-us forms send here. */
  whatsapp: "919871276179" as string | null,
  supportPhone: PUBLIC_PHONE as string | null,
  /** Opening hours, e.g. "Mon–Sat, 10:00–18:00 IST". */
  hours:
    "Mon–Sat, 10:00–18:00 IST from November 2026. Until then, WhatsApp replies within one working day." as
      string | null,
  /** Hub street address: a small ground-floor room in Gandhi Nagar, between Bahu Plaza and Gole Market. */
  hubAddress: "Gandhi Nagar, between Bahu Plaza and Gole Market. Exact address when we open." as
    string | null,
  /** When the hub opens for drop-offs and pickups (plan: November 2026). */
  hubOpens: "November 2026",
  /** Required for platforms under India's IT Rules 2021 and the DPDP Act 2023. */
  grievanceOfficer: {
    name: "Harsh Raj",
    designation: "Grievance Officer",
    email: SUPPORT_EMAIL,
    phone: PUBLIC_PHONE,
  } as { name: string; designation: string; email: string; phone: string } | null,
  /** Date the legal pages were last updated (YYYY-MM-DD). */
  legalUpdated: "2026-10-14",
} as const;

/** True once at least one channel exists for sell-to-us requests to reach ReLoop. */
export const hasContactChannel = Boolean(SITE.whatsapp || SITE.supportEmail);
