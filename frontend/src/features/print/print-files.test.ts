// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { DRIVE_LINK } from "@/config/locations";

const publicDir = join(__dirname, "../../../public");

describe("printable outreach files", () => {
  it.each(["counter-card", "awareness-flyer"])("%s.pdf is one A4 page with content", (name) => {
    const pdf = readFileSync(join(publicDir, "print", `${name}.pdf`)).toString("latin1");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1);
    const box = pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
    // A4 is 595.28 × 841.89 points.
    expect(Math.abs(Number(box?.[1]) - 595.28)).toBeLessThan(2);
    expect(Math.abs(Number(box?.[2]) - 841.89)).toBeLessThan(2);
    // A blank page is about 1 KB; real sheets carry fonts and the QR code.
    expect(pdf.length).toBeGreaterThan(50_000);
  });

  it("the flyer's QR code encodes the /go/drive link", async () => {
    // Same options as scripts/make-qr.mjs: regenerating must give the committed file.
    const expected = await QRCode.toString(DRIVE_LINK.publicUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: { dark: "#0b2b26", light: "#ffffff" },
    });
    expect(readFileSync(join(publicDir, "qr", "awareness-drive.svg"), "utf8")).toBe(expected);
    expect(DRIVE_LINK.publicUrl).toBe("https://re-loop-ochre.vercel.app/go/drive");
  });

  it("the counter card's QR code encodes the /go/rate-card link", async () => {
    const url = "https://re-loop-ochre.vercel.app/go/rate-card";
    const expected = await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: { dark: "#0b2b26", light: "#ffffff" },
    });
    expect(readFileSync(join(publicDir, "qr", "rate-card.svg"), "utf8")).toBe(expected);
  });
});
