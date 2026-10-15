import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MonthlyBars } from "./MonthlyBars";
import { SankeyChart } from "./SankeyChart";

describe("SankeyChart", () => {
  const links = [
    { source: "Repair shops", target: "At the hub", value: 40.5 },
    { source: "Retailers", target: "Handed to VRRG Group", value: 10 },
  ];

  it("draws an SVG with a labelled node per source and outcome, and a table of the same numbers", () => {
    const html = renderToStaticMarkup(<SankeyChart title="Scrap" links={links} unit="kg" />);
    expect(html).toContain("<svg");
    expect(html).toContain("Repair shops");
    expect(html).toContain("Handed to VRRG Group");
    expect(html).toContain("<table");
    expect(html).toContain("40.5 kg");
    expect(html.match(/<path/g)).toHaveLength(2);
  });

  it("renders nothing when there is nothing to draw", () => {
    expect(renderToStaticMarkup(<SankeyChart title="x" links={[]} unit="kg" />)).toBe("");
  });
});

describe("MonthlyBars", () => {
  it("writes each month's value next to its bar", () => {
    const html = renderToStaticMarkup(
      <MonthlyBars
        months={[
          { month: "2026-11-01", scrapKg: 92, items: 15 },
          { month: "2026-12-01", scrapKg: 0, items: 0 },
        ]}
      />,
    );
    expect(html).toContain("Nov 2026");
    expect(html).toContain(">92<");
    expect(html).toContain("Dec 2026");
  });

  it("renders nothing without months", () => {
    expect(renderToStaticMarkup(<MonthlyBars months={[]} />)).toBe("");
  });
});
