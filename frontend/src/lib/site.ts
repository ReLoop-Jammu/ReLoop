/**
 * Business details shown across the site (footer, contact, legal pages,
 * structured data). Fill in the `null` values once the team confirms them —
 * see docs/team-setup.md. Anything left `null` is hidden or shown as
 * "coming soon" rather than displaying a placeholder.
 */
export const SITE = {
  name: "ReLoop Jammu",
  shortName: "ReLoop",
  tagline: "Used electronics & e-waste marketplace",
  description:
    "Buy, sell and recover value from used electronics, repairable devices and reusable components. Collected in Jammu, connected to buyers across India.",
  city: "Jammu, Jammu & Kashmir, India",
  /** Registered legal name of the business or organisation. */
  legalName: null as string | null,
  /** Registered postal address. */
  address: null as string | null,
  supportEmail: null as string | null,
  supportPhone: null as string | null,
  /** Opening hours, e.g. "Mon–Sat, 10:00–18:00 IST". */
  hours: null as string | null,
  /** Required for platforms under India's IT Rules 2021 and the DPDP Act 2023. */
  grievanceOfficer: null as { name: string; email: string } | null,
  /** Date the legal pages were last updated (YYYY-MM-DD). */
  legalUpdated: "2026-10-02",
} as const;
