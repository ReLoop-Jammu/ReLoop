"use client";

import { useEffect, useRef } from "react";
import { LOCATIONS, type PartnerShop } from "@/config/locations";

// Same values as the --color-map-* tokens in globals.css (a unit test checks).
export const MAP_COLORS = {
  hub: "#26436c",
  route: "#9a5f17",
  recycler: "#a3412f",
  partner: "#2f6b4f",
};
const BRAND = MAP_COLORS.hub;
const ROUTE = MAP_COLORS.route;
const RECYCLER = MAP_COLORS.recycler;

/**
 * Interactive OpenStreetMap of the hub area, the pickup route, partner shops
 * and the recycler. Leaflet loads in the browser only. Everything here is also
 * listed in text on the page, so the map is never the only way to read it.
 */
export function LocationsMap({ partnerShops }: { partnerShops: readonly PartnerShop[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        // Sharp tiles on high-density phone screens.
        detectRetina: true,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const { hub, routes, recycler } = LOCATIONS;
      L.circle([hub.lat, hub.lng], {
        radius: hub.areaRadiusM,
        color: BRAND,
        fillOpacity: 0.15,
      })
        .bindTooltip(`${hub.name} (approximate area)`)
        .addTo(map);

      for (const route of routes) {
        const stops = route.stops.slice(0, -1);
        L.polyline(
          route.stops.map((s) => [s.lat, s.lng]),
          { color: ROUTE, weight: 4, dashArray: "8 6" },
        )
          .bindTooltip(`${route.day} route: ${route.name}`)
          .addTo(map);
        stops.forEach((stop, i) => {
          if (i === 0) return;
          L.marker([stop.lat, stop.lng], {
            icon: L.divIcon({
              className: "",
              html: `<span style="display:grid;place-items:center;width:26px;height:26px;border-radius:9999px;background:${ROUTE};color:white;font:600 13px system-ui;border:2px solid white">${route.day[0]}${i}</span>`,
              iconSize: [26, 26],
            }),
            // Labels only: at city zoom the stops overlap, and every stop is
            // listed with its time below the map.
            interactive: false,
            keyboard: false,
          }).addTo(map!);
        });
      }

      for (const shop of partnerShops) {
        L.circleMarker([shop.lat, shop.lng], {
          radius: 7,
          color: MAP_COLORS.partner,
          fillOpacity: 0.9,
        })
          .bindTooltip(`${shop.name}, ${shop.market}`)
          .addTo(map);
      }

      L.circle([recycler.lat, recycler.lng], {
        radius: 600,
        color: RECYCLER,
        fillOpacity: 0.15,
      })
        .bindTooltip(`${recycler.name} (approximate area)`)
        .addTo(map);

      map.fitBounds(
        L.latLngBounds([
          [hub.lat, hub.lng],
          [recycler.lat, recycler.lng],
          ...routes.flatMap((r) => r.stops.map((s) => [s.lat, s.lng] as [number, number])),
        ]),
        { padding: [30, 30] },
      );
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [partnerShops]);

  return (
    <div
      ref={container}
      role="region"
      aria-label="Map of the ReLoop hub area, pickup routes and dismantling partner"
      className="h-[22rem] w-full overflow-hidden rounded-2xl border border-line bg-sunken sm:h-[28rem]"
    />
  );
}
