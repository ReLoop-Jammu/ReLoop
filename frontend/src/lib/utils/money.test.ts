import { describe, expect, it } from "vitest";
import { formatPrice, rupeesToPaise } from "./money";

describe("formatPrice", () => {
  it("formats paise as Indian rupees with Indian digit grouping", () => {
    expect(formatPrice(1_450_000)).toBe("₹14,500");
    expect(formatPrice(185_000_000)).toBe("₹18,50,000");
  });

  it("keeps paise when present", () => {
    expect(formatPrice(95_050)).toBe("₹950.5");
  });

  it("shows a quote prompt when there is no price", () => {
    expect(formatPrice(null)).toBe("Request quote");
  });
});

describe("rupeesToPaise", () => {
  it("avoids floating point drift", () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
  });
});
