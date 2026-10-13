/**
 * Business details shown across the site (footer, contact, legal pages,
 * structured data). Set them with NEXT_PUBLIC_* environment variables (see
 * .env.example and docs/team-setup.md); no code change is needed. Anything
 * left unset is hidden or shown as "coming soon" rather than a placeholder.
 */
const fromEnv = (value: string | undefined): string | null => value?.trim() || null;

const grievanceName = fromEnv(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME);
const grievanceEmail = fromEnv(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_EMAIL);

export const SITE = {
  name: "ReLoop Jammu",
  shortName: "ReLoop",
  tagline: "Graded used electronics, collected in Jammu",
  description:
    "ReLoop buys used and broken electronics in Jammu, grades every item at one hub, resells what still works and sends the rest to an authorised recycler.",
  city: "Jammu, Jammu & Kashmir, India",
  /** Registered legal name of the business or organisation. */
  legalName: fromEnv(process.env.NEXT_PUBLIC_LEGAL_NAME),
  /** Registered postal address. */
  address: fromEnv(process.env.NEXT_PUBLIC_ADDRESS),
  supportEmail: fromEnv(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  /** WhatsApp number in international format without "+" or spaces, e.g. "919876543210". Sell-to-us forms send here. */
  whatsapp: fromEnv(process.env.NEXT_PUBLIC_WHATSAPP)?.replace(/\D/g, "") || null,
  supportPhone: fromEnv(process.env.NEXT_PUBLIC_SUPPORT_PHONE),
  /** Opening hours, e.g. "Mon–Sat, 10:00–18:00 IST". */
  hours: fromEnv(process.env.NEXT_PUBLIC_HOURS),
  /** Hub (collection point) street address. The plan places it in the old-city market belt. */
  hubAddress: fromEnv(process.env.NEXT_PUBLIC_HUB_ADDRESS),
  /** When the hub opens for drop-offs and pickups (plan: November 2026). */
  hubOpens: "November 2026",
  /** Required for platforms under India's IT Rules 2021 and the DPDP Act 2023. */
  grievanceOfficer:
    grievanceName && grievanceEmail ? { name: grievanceName, email: grievanceEmail } : null,
  /** Date the legal pages were last updated (YYYY-MM-DD). */
  legalUpdated: "2026-10-02",
};

/** True once at least one channel exists for sell-to-us requests to reach ReLoop. */
export const hasContactChannel = Boolean(SITE.whatsapp || SITE.supportEmail);
