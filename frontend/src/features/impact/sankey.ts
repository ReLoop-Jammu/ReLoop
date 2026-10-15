import type { Link } from "./flows";

export type SankeyNode = {
  id: string;
  side: "left" | "right";
  value: number;
  x: number;
  y: number;
  height: number;
};
export type SankeyLink = Link & { path: string; width: number };

export type SankeyLayout = {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width: number;
  height: number;
  nodeWidth: number;
};

/**
 * A two-column Sankey: sources on the left, outcomes on the right, each link a
 * band whose thickness is proportional to its value. Pure geometry, so it can
 * be rendered on the server and tested.
 */
export function layoutSankey(
  links: readonly Link[],
  { width = 720, height = 320, nodeWidth = 14, gap = 12 } = {},
): SankeyLayout {
  const live = links.filter((l) => l.value > 0);
  const total = live.reduce((s, l) => s + l.value, 0);
  const sum = (side: "source" | "target") => {
    const m = new Map<string, number>();
    for (const l of live) m.set(l[side], (m.get(l[side]) ?? 0) + l.value);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const left = sum("source");
  const right = sum("target");
  if (!total) return { nodes: [], links: [], width, height, nodeWidth };

  const slots = Math.max(left.length, right.length);
  const scale = (height - gap * (slots - 1)) / total;
  const place = (rows: [string, number][], side: "left" | "right") => {
    let y = 0;
    return rows.map(([id, value]) => {
      const node: SankeyNode = {
        id,
        side,
        value,
        x: side === "left" ? 0 : width - nodeWidth,
        y,
        height: value * scale,
      };
      y += node.height + gap;
      return node;
    });
  };
  const nodes = [...place(left, "left"), ...place(right, "right")];
  const byId = (side: "left" | "right", id: string) =>
    nodes.find((n) => n.side === side && n.id === id)!;

  const outOffset = new Map<string, number>();
  const inOffset = new Map<string, number>();
  const rightOrder = new Map(right.map(([id], i) => [id, i]));
  const sorted = [...live].sort(
    (a, b) =>
      left.findIndex(([id]) => id === a.source) - left.findIndex(([id]) => id === b.source) ||
      (rightOrder.get(a.target) ?? 0) - (rightOrder.get(b.target) ?? 0),
  );
  const out = sorted.map((l) => {
    const s = byId("left", l.source);
    const t = byId("right", l.target);
    const w = l.value * scale;
    const sy = s.y + (outOffset.get(l.source) ?? 0);
    const ty = t.y + (inOffset.get(l.target) ?? 0);
    outOffset.set(l.source, (outOffset.get(l.source) ?? 0) + w);
    inOffset.set(l.target, (inOffset.get(l.target) ?? 0) + w);
    const x0 = s.x + nodeWidth;
    const x1 = t.x;
    const xm = (x0 + x1) / 2;
    const f = (n: number) => Math.round(n * 100) / 100;
    const path =
      `M${f(x0)},${f(sy)} C${f(xm)},${f(sy)} ${f(xm)},${f(ty)} ${f(x1)},${f(ty)} ` +
      `L${f(x1)},${f(ty + w)} C${f(xm)},${f(ty + w)} ${f(xm)},${f(sy + w)} ${f(x0)},${f(sy + w)} Z`;
    return { ...l, path, width: w };
  });
  return { nodes, links: out, width, height, nodeWidth };
}
