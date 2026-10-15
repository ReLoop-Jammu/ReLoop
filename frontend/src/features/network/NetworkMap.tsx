"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_COLORS } from "@/features/locations/LocationsMap";
import { HUB_POSITION, VRRG_POSITION, lineWeight, marketPosition } from "./geo";

export type MapFlow = { market: string; value: number; label: string };

/**
 * Flows on a map of Jammu: a line from each route market to the hub and from
 * the hub to VRRG Group, thicker for more volume. Leaflet loads only when the
 * map scrolls into view. Every flow is also listed in text on the page.
 */
export function NetworkMap({ markets, vrrgKg }: { markets: MapFlow[]; vrrgKg: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = holder.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !holder.current) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current) return;
      map = L.map(holder.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        detectRetina: true,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const max = Math.max(...markets.map((m) => m.value), vrrgKg, 1);
      const points: [number, number][] = [[HUB_POSITION.lat, HUB_POSITION.lng]];
      for (const m of markets) {
        const pos = marketPosition(m.market);
        if (!pos) continue;
        points.push([pos.lat, pos.lng]);
        L.polyline(
          [
            [pos.lat, pos.lng],
            [HUB_POSITION.lat, HUB_POSITION.lng],
          ],
          { color: MAP_COLORS.route, weight: lineWeight(m.value, max), opacity: 0.7 },
        )
          .bindTooltip(`${m.market} to the hub: ${m.label}`)
          .addTo(map);
      }
      if (vrrgKg > 0) {
        points.push([VRRG_POSITION.lat, VRRG_POSITION.lng]);
        L.polyline(
          [
            [HUB_POSITION.lat, HUB_POSITION.lng],
            [VRRG_POSITION.lat, VRRG_POSITION.lng],
          ],
          { color: MAP_COLORS.recycler, weight: lineWeight(vrrgKg, max), opacity: 0.7 },
        )
          .bindTooltip(`Hub to VRRG Group: ${vrrgKg} kg`)
          .addTo(map);
      }
      L.circleMarker([HUB_POSITION.lat, HUB_POSITION.lng], {
        radius: 8,
        color: MAP_COLORS.hub,
        fillOpacity: 0.9,
      })
        .bindTooltip("ReLoop hub")
        .addTo(map);
      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
      else map.setView([HUB_POSITION.lat, HUB_POSITION.lng], 14);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [visible, markets, vrrgKg]);

  return (
    <div
      ref={holder}
      role="region"
      aria-label="Map of the flows between Jammu markets, the ReLoop hub and VRRG Group"
      className="h-[22rem] w-full overflow-hidden rounded-2xl border border-line bg-sunken sm:h-[28rem]"
    />
  );
}
