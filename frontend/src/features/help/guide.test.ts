// @vitest-environment node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE, guideMarkdown, guideParts } from "./guide";

const DOC = join(__dirname, "../../../../docs/report/shop-owner-guide.md");

describe("shop owner guide", () => {
  it("has every section in English and Hindi, with the same number of steps", () => {
    expect(GUIDE.sections.map((s) => s.id)).toEqual([
      "sign-up",
      "verification",
      "submit",
      "offers",
      "pickup",
      "payment",
      "contact",
    ]);
    for (const s of GUIDE.sections) {
      expect(s.hi.steps.length, s.id).toBe(s.en.steps.length);
      expect(s.hi.title).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("fills placeholders and turns site paths into links", () => {
    const parts = guideParts("Open {site}/account. We collect on our {days} route.");
    expect(parts).toEqual([
      { text: "Open " },
      { path: "/account" },
      { text: ". We collect on our Tuesday and Friday route." },
    ]);
    for (const s of GUIDE.sections)
      for (const step of [...s.en.steps, ...s.hi.steps])
        for (const p of guideParts(step)) if ("text" in p) expect(p.text).not.toMatch(/[{}]/);
  });

  it("docs/report/shop-owner-guide.md matches the guide (npm run help-guide -w frontend)", () => {
    const md = guideMarkdown() + "\n";
    if (process.env.UPDATE_GUIDE) writeFileSync(DOC, md);
    expect(readFileSync(DOC, "utf8")).toBe(md);
    expect(md).toContain("Hindi: to be checked by a native speaker");
  });
});
