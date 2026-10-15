import { formatKg } from "./totals";
import { layoutSankey } from "./sankey";
import type { Link } from "./flows";

const COLORS = ["fill-brand-600", "fill-gold-500", "fill-grade-a", "fill-grade-b", "fill-muted"];

/**
 * A server-rendered SVG Sankey of source to outcome. The same numbers are in a
 * table below the picture, so the chart is never the only way to read them.
 */
export function SankeyChart({
  title,
  links,
  unit,
}: {
  title: string;
  links: Link[];
  unit: "kg" | "items";
}) {
  const layout = layoutSankey(links, { width: 720, height: 300, gap: 14 });
  const fmt = (n: number) => (unit === "kg" ? `${formatKg(n)} kg` : `${formatKg(n)} items`);
  if (!layout.nodes.length) return null;
  const leftIds = layout.nodes.filter((n) => n.side === "left").map((n) => n.id);
  const colour = (id: string) => COLORS[leftIds.indexOf(id) % COLORS.length];
  return (
    <figure>
      <svg
        viewBox={`-150 -8 ${layout.width + 330} ${layout.height + 16}`}
        role="img"
        aria-label={title}
        className="h-auto w-full"
      >
        {layout.links.map((l) => (
          <path
            key={`${l.source}-${l.target}`}
            d={l.path}
            className={`${colour(l.source)} opacity-30`}
          >
            <title>{`${l.source} to ${l.target}: ${fmt(l.value)}`}</title>
          </path>
        ))}
        {layout.nodes.map((n) => (
          <g key={`${n.side}-${n.id}`}>
            <rect
              x={n.x}
              y={n.y}
              width={layout.nodeWidth}
              height={Math.max(n.height, 2)}
              className={n.side === "left" ? colour(n.id) : "fill-ink"}
            />
            <text
              x={n.side === "left" ? n.x - 8 : n.x + layout.nodeWidth + 8}
              y={n.y + n.height / 2}
              dominantBaseline="middle"
              textAnchor={n.side === "left" ? "end" : "start"}
              className="fill-ink text-[13px]"
            >
              {n.id}
              <tspan className="fill-muted"> · {fmt(n.value)}</tspan>
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">{title}</figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">{unit === "kg" ? "Kilograms" : "Items"}</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr key={`${l.source}-${l.target}`}>
              <td>{l.source}</td>
              <td>{l.target}</td>
              <td>{fmt(l.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
