/**
 * Everything the /locations page and its map show. Edit this one file to
 * update the hub, drop-off shops, the pickup route or the recycler.
 *
 * Rules:
 * - Only list a partner shop with agreedToBeShown: true, after the shop owner
 *   has said yes to being on the public map.
 * - Keep approximate: true until a location is an exact, confirmed address.
 *   Approximate places are drawn as an area, not a pin.
 * - Recycler details are public information only (CPCB's list of authorised
 *   dismantlers/recyclers); no phone numbers or exact addresses.
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

export const LOCATIONS = {
  hub: {
    name: "ReLoop hub",
    description:
      "Old-city market belt, between Raghunath Bazaar and Residency Road. Exact address when we open in November 2026.",
    lat: 32.7286,
    lng: 74.8622,
    approximate: true,
    /** Radius of the area drawn on the map while the address isn't fixed, in metres. */
    areaRadiusM: 450,
  } satisfies Place & { areaRadiusM: number },

  partnerShops: [] as PartnerShop[],
  partnerShopsEmptyText: "Partner drop-off shops will be listed here as they join.",

  route: {
    days: ["Tuesday", "Friday"],
    status: "Planned from November 2026",
    stops: [
      { time: "10:00", name: "ReLoop hub", note: "Leave the hub", lat: 32.7286, lng: 74.8622 },
      {
        time: "10:30",
        name: "Raghunath Bazaar",
        note: "Repair shops and retailers",
        lat: 32.7302,
        lng: 74.8641,
      },
      {
        time: "12:00",
        name: "Residency Road",
        note: "Repair shops and retailers",
        lat: 32.7268,
        lng: 74.8596,
      },
      {
        time: "13:30",
        name: "Gandhi Nagar",
        note: "Repair shops and retailers",
        lat: 32.7037,
        lng: 74.8617,
      },
      { time: "15:00", name: "ReLoop hub", note: "Back at the hub", lat: 32.7286, lng: 74.8622 },
    ] satisfies RouteStop[],
  },

  recycler: {
    name: "VRG Groups, Gangyal",
    description:
      "The authorised e-waste recycler we hand dead and hazardous items to, by weight with a receipt. Listed by CPCB as an authorised dismantler/recycler.",
    lat: 32.6873,
    lng: 74.8794,
    approximate: true,
  } satisfies Place,
} as const;

/** The awareness-drive QR code points here. It must keep working: printed codes depend on it. */
export const DRIVE_LINK = {
  path: "/go/drive",
  publicUrl: "https://re-loop-ochre.vercel.app/go/drive",
  campaign: "awareness-drive-2026",
  destination: "/locations?utm_source=qr&utm_medium=print&utm_campaign=awareness-drive-2026",
} as const;

/** The partner shops that may appear publicly. */
export const visiblePartnerShops = () => LOCATIONS.partnerShops.filter((s) => s.agreedToBeShown);
