import { LOCATIONS, ROUTE_MARKET_STOPS } from "@/config/locations";
import { HUB_POSITION, VRRG_POSITION, projectPoints } from "./geo";

/**
 * A small static drawing of the loop in Jammu (route markets, the hub and
 * VRRG Group). It is a sketch of where things are, not data.
 */
export function NetworkPreview() {
  const stops = ROUTE_MARKET_STOPS.map((s) => ({ name: s.name, lat: s.lat, lng: s.lng }));
  const pts = projectPoints([HUB_POSITION, VRRG_POSITION, ...stops], 360, 240);
  const hub = pts[0];
  const vrrg = pts[1];
  return (
    <svg
      viewBox="0 0 360 240"
      role="img"
      aria-label="A sketch of the loop: Jammu markets send stock to the ReLoop hub, and scrap goes from the hub to VRRG Group"
      className="h-auto w-full"
    >
      <rect width="360" height="240" rx="16" className="fill-sunken" />
      {pts.slice(2).map((p, i) => (
        <g key={stops[i].name}>
          <line
            x1={p.x}
            y1={p.y}
            x2={hub.x}
            y2={hub.y}
            className="stroke-gold-500"
            strokeWidth="3"
            strokeDasharray="6 5"
          />
          <circle cx={p.x} cy={p.y} r="6" className="fill-gold-500" />
          <text x={p.x + 10} y={p.y + 4} className="fill-ink text-[11px]">
            {stops[i].name}
          </text>
        </g>
      ))}
      <line
        x1={hub.x}
        y1={hub.y}
        x2={vrrg.x}
        y2={vrrg.y}
        className="stroke-danger"
        strokeWidth="3"
      />
      <circle cx={vrrg.x} cy={vrrg.y} r="7" className="fill-danger" />
      <text x={vrrg.x + 10} y={vrrg.y + 4} className="fill-ink text-[11px]">
        {LOCATIONS.recycler.name.split(",")[0]}
      </text>
      <circle cx={hub.x} cy={hub.y} r="9" className="fill-brand-600" />
      <text x={hub.x + 12} y={hub.y + 4} className="fill-ink text-[12px] font-semibold">
        ReLoop hub
      </text>
    </svg>
  );
}
