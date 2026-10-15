/**
 * Everything the /locations page and its map show. Edit this one file to
 * update the hub, partner shops, the pickup routes or the dismantling partner.
 *
 * Rules:
 * - Only list a partner shop with agreedToBeShown: true, after the shop owner
 *   has said yes to being on the public map.
 * - Keep approximate: true until a location is an exact, confirmed address.
 *   Approximate places are drawn as an area, not a pin.
 * - The dismantling partner's details are public information only; no phone
 *   numbers or exact addresses.
 */

export type LatLng = { lat: number; lng: number };

export type Place = LatLng & {
  name: string;
  description: string;
  approximate: boolean;
};

export type PartnerShop = Place & {
  market: string;
  /** Set only once the shop owner has agreed to appear on the public map. */
  agreedToBeShown: boolean;
};

export type RouteStop = LatLng & { time: string; name: string; note: string };

export const HUB_DESCRIPTION =
  "A small ground-floor room in Gandhi Nagar, between Bahu Plaza and Gole Market. Exact address when we open.";

export const LOCATIONS = {
  hub: {
    name: "ReLoop hub",
    description: HUB_DESCRIPTION,
    lat: 32.7109,
    lng: 74.857,
    approximate: true,
    /** Radius of the area drawn on the map while the address isn't fixed, in metres. */
    areaRadiusM: 300,
  } satisfies Place & { areaRadiusM: number },

  partnerShops: [] as PartnerShop[],
  partnerShopsEmptyText: "Partner shops on our route will be listed here as they join.",

  /** Two weekly routes: Tuesday through the Gandhi Nagar cluster, Friday through the old city. */
  routes: [
    {
      day: "Tuesday",
      name: "Gandhi Nagar cluster",
      markets: ["Bahu Plaza", "Gole Market"],
      status: "From November 2026",
      stops: [
        { time: "10:00", name: "ReLoop hub", note: "Leave the hub", lat: 32.7109, lng: 74.857 },
        {
          time: "10:30",
          name: "Bahu Plaza",
          note: "Repair shops and retailers",
          lat: 32.7097,
          lng: 74.8554,
        },
        {
          time: "12:00",
          name: "Gole Market",
          note: "Repair shops and retailers",
          lat: 32.7121,
          lng: 74.8587,
        },
        { time: "14:00", name: "ReLoop hub", note: "Back at the hub", lat: 32.7109, lng: 74.857 },
      ] satisfies RouteStop[],
    },
    {
      day: "Friday",
      name: "Old city",
      markets: ["Raghunath Bazaar", "Residency Road"],
      status: "From January 2027",
      stops: [
        { time: "10:00", name: "ReLoop hub", note: "Leave the hub", lat: 32.7109, lng: 74.857 },
        {
          time: "10:45",
          name: "Raghunath Bazaar",
          note: "Repair shops and retailers",
          lat: 32.7268,
          lng: 74.8596,
        },
        {
          time: "12:15",
          name: "Residency Road",
          note: "Repair shops and retailers",
          lat: 32.7302,
          lng: 74.8641,
        },
        { time: "14:30", name: "ReLoop hub", note: "Back at the hub", lat: 32.7109, lng: 74.857 },
      ] satisfies RouteStop[],
    },
  ],
  /** Markets planned after the pilot: more Jammu markets, not other cities. */
  nextMarkets: ["Janipur", "Trikuta Nagar", "Talab Tillo"],

  recycler: {
    name: "VRRG Group, Gangyal",
    description:
      "Our dismantling partner, a JKPCC-authorised e-waste dismantler. Every kilo of scrap and every battery is handed to them by weight, on a weight receipt.",
    lat: 32.6873,
    lng: 74.8794,
    approximate: true,
  } satisfies Place,
} as const;

/** Route days, in week order. */
export const ROUTE_DAYS = LOCATIONS.routes.map((r) => r.day);
/** The markets on a route, as approximate map positions (the hub itself is not a market). */
export const ROUTE_MARKET_STOPS = LOCATIONS.routes
  .flatMap((r) => r.stops)
  .filter((s) => s.name !== LOCATIONS.hub.name);

/** The awareness-drive QR code points here. It must keep working: printed codes depend on it. */
export const DRIVE_LINK = {
  path: "/go/drive",
  publicUrl: "https://re-loop-ochre.vercel.app/go/drive",
  campaign: "awareness-drive-2026",
  destination: "/locations?utm_source=qr&utm_medium=print&utm_campaign=awareness-drive-2026",
} as const;

/** The partner shops that may appear publicly. */
export const visiblePartnerShops = () => LOCATIONS.partnerShops.filter((s) => s.agreedToBeShown);
