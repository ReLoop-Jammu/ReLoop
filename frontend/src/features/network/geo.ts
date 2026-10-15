import { LOCATIONS, ROUTE_MARKET_STOPS, type LatLng } from "@/config/locations";

/** Map position of a route market by name (approximate); null for merged groups such as "Other Jammu markets". */
export function marketPosition(name: string): LatLng | null {
  const stop = ROUTE_MARKET_STOPS.find((s) => s.name.toLowerCase() === name.toLowerCase());
  return stop ? { lat: stop.lat, lng: stop.lng } : null;
}

/** Line thickness in pixels for a flow, from 2 (smallest) to 10 (largest). */
export function lineWeight(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 2;
  return Math.round((2 + 8 * Math.min(value / max, 1)) * 10) / 10;
}

export const HUB_POSITION: LatLng = { lat: LOCATIONS.hub.lat, lng: LOCATIONS.hub.lng };
export const VRRG_POSITION: LatLng = { lat: LOCATIONS.recycler.lat, lng: LOCATIONS.recycler.lng };

/**
 * Projects map positions into an SVG box (equirectangular, good enough for a
 * city-sized area), keeping the aspect ratio.
 */
export function projectPoints(points: readonly LatLng[], width: number, height: number, pad = 24) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLng - minLng) * kx, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return points.map((p) => ({
    x: Math.round((offX + (p.lng - minLng) * kx * scale) * 10) / 10,
    y: Math.round((offY + (maxLat - p.lat) * scale) * 10) / 10,
  }));
}
