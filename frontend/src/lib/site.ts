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
  tagline: "Graded used electronics, collected in Jammu",
  description:
    "ReLoop buys used and broken electronics in Jammu, grades every item at one hub, resells what still works and sends the rest to an authorised recycler.",
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
  /** Hub (collection point) street address. The plan places it in the old-city market belt. */
  hubAddress:
    "Old-city market belt, between Raghunath Bazaar and Residency Road. Exact address when we open in November 2026." as
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
