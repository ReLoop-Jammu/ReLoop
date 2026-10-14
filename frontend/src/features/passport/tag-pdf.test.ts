// @vitest-environment node
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("item tag", () => {
  it("is one 62 × 29 mm label pointing at the item's passport", async () => {
    const { tagPdf, passportUrl } = await import("./tag-pdf");
    expect(passportUrl("RL-JMU-0042")).toBe(
      "https://re-loop-ochre.vercel.app/passport/RL-JMU-0042",
    );
    const doc = await PDFDocument.load(await tagPdf("RL-JMU-0042", "Laptop"));
    expect(doc.getPageCount()).toBe(1);
    const p = doc.getPage(0);
    expect([
      Math.round((p.getWidth() * 25.4) / 72),
      Math.round((p.getHeight() * 25.4) / 72),
    ]).toEqual([62, 29]);
    expect(doc.getTitle()).toBe("ReLoop tag RL-JMU-0042");
  });

  it("fits a long tag", async () => {
    const { tagPdf } = await import("./tag-pdf");
    await expect(tagPdf("RL-JMU-123456", "Small appliance")).resolves.toBeInstanceOf(Uint8Array);
  });
});
