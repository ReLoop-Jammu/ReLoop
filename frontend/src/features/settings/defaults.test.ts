import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings } from "./defaults";

describe("mergeSettings", () => {
  it("keeps the defaults when nothing is stored", () => {
    expect(mergeSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it("applies stored values, and null keeps the default", () => {
    const s = mergeSettings([
      { key: "contact.hours", value: "Mon–Sat 10–6" },
      { key: "contact.email", value: null },
      { key: "accept.dont", value: ["Fridges"] },
      { key: "pricing.grade_b_factor", value: 0.7 },
    ]);
    expect(s.hours).toBe("Mon–Sat 10–6");
    expect(s.supportEmail).toBe(DEFAULT_SETTINGS.supportEmail);
    expect(s.acceptDont).toEqual(["Fridges"]);
    expect(s.gradeBFactor).toBe(0.7);
  });

  it("an empty contact hides that channel; an empty list keeps the default", () => {
    const s = mergeSettings([
      { key: "contact.email", value: "" },
      { key: "accept.take", value: [] },
    ]);
    expect(s.supportEmail).toBeNull();
    expect(s.acceptTake).toEqual(DEFAULT_SETTINGS.acceptTake);
  });

  it("ignores unknown keys, private keys and wrong types", () => {
    const s = mergeSettings([
      { key: "pricing.target_margin_pct", value: 40 },
      { key: "secret", value: "x" },
      { key: "pricing.grade_b_factor", value: "lots" },
    ]);
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it("normalises the WhatsApp number to digits", () => {
    expect(mergeSettings([{ key: "contact.whatsapp", value: "+91 98712-76179" }]).whatsapp).toBe(
      "919871276179",
    );
  });
});
