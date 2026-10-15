import { DRIVE_LINK } from "./locations";

/** The production address that short links are shared with. */
export const PUBLIC_SITE = "https://re-loop-ochre.vercel.app";

export type TrackedLink = {
  /** The short link is /go/<slug>. Same rule as link_visits.slug in the database. */
  slug: string;
  /** Where the team uses it. */
  use: string;
  source: string;
  medium: string;
  campaign: string;
  /** The page it lands on, without UTM tags. */
  landing: string;
};

/**
 * Every short link ReLoop shares. Each click on /go/<slug> is counted (link,
 * source, medium and time only) and redirected to the landing page with UTM
 * tags. Printed QR codes depend on "drive": never change or remove it.
 */
export const TRACKED_LINKS: readonly TrackedLink[] = [
  {
    slug: "ig-bio",
    use: "Instagram bio",
    source: "instagram",
    medium: "bio",
    campaign: "reloop-pilot",
    landing: "/",
  },
  {
    slug: "ig-post",
    use: "Instagram posts",
    source: "instagram",
    medium: "post",
    campaign: "reloop-pilot",
    landing: "/shop",
  },
  {
    slug: "ig-story",
    use: "Instagram stories",
    source: "instagram",
    medium: "story",
    campaign: "reloop-pilot",
    landing: "/what-we-accept",
  },
  {
    slug: "wa",
    use: "WhatsApp messages, groups and status",
    source: "whatsapp",
    medium: "share",
    campaign: "reloop-pilot",
    landing: "/",
  },
  {
    slug: "drive",
    use: "Awareness-drive QR code (printed)",
    source: "qr",
    medium: "print",
    campaign: DRIVE_LINK.campaign,
    landing: "/locations",
  },
  {
    slug: "rate-card",
    use: "Printed rate card and shopkeeper counter card (QR code)",
    source: "qr",
    medium: "print",
    campaign: "rate-card-print",
    landing: "/rate-card",
  },
];

export const findTrackedLink = (slug: string) => TRACKED_LINKS.find((l) => l.slug === slug);

/** The landing page with its UTM tags, e.g. "/shop?utm_source=instagram&…". */
export function trackedDestination(link: TrackedLink) {
  const query = new URLSearchParams({
    utm_source: link.source,
    utm_medium: link.medium,
    utm_campaign: link.campaign,
  });
  return `${link.landing}?${query}`;
}

export const shortUrl = (link: TrackedLink) => `${PUBLIC_SITE}/go/${link.slug}`;
