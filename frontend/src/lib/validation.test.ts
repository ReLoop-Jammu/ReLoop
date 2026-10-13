import { describe, expect, it } from "vitest";
import { email, gstin, isSafeImageUrl, phone, safeNextPath, text } from "./validation";

describe("safeNextPath", () => {
  it("keeps local paths", () => {
    expect(safeNextPath("/hub/items")).toBe("/hub/items");
  });
  it("rejects anything that could leave the site", () => {
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", ""]) {
      expect(safeNextPath(bad)).toBe("/account");
    }
    expect(safeNextPath(null, "/")).toBe("/");
  });
});

describe("isSafeImageUrl", () => {
  it("accepts ordinary https links", () => {
    expect(isSafeImageUrl("https://images.example.com/a.jpg")).toBe(true);
  });
  it("rejects http, credentials, local and private hosts", () => {
    for (const bad of [
      "http://example.com/a.jpg",
      "https://user:pw@example.com/a.jpg",
      "https://localhost/a.jpg",
      "https://127.0.0.1/a.jpg",
      "https://192.168.1.4/a.jpg",
      "https://printer.local/a.jpg",
      "https://[::1]/a.jpg",
      "not a url",
    ]) {
      expect(isSafeImageUrl(bad)).toBe(false);
    }
  });
});

describe("field rules", () => {
  it("normalises phone numbers typed with spaces and dashes", () => {
    expect(phone.parse("+91 98765-43210")).toBe("+919876543210");
    expect(phone.safeParse("12345").success).toBe(false);
  });
  it("lowercases and checks email", () => {
    expect(email.parse("  Asha@Example.COM ")).toBe("asha@example.com");
    expect(email.safeParse("nope").success).toBe(false);
  });
  it("checks GSTIN structure", () => {
    expect(gstin.parse("01abcde1234f1z5")).toBe("01ABCDE1234F1Z5");
    expect(gstin.safeParse("123456789012345").success).toBe(false);
  });
  it("collapses whitespace and enforces length", () => {
    expect(text(2, 10, "Name").parse("  A   B ")).toBe("A B");
    expect(text(2, 5, "Name").safeParse("far too long").success).toBe(false);
    expect(text(1, 5, "Name").safeParse("   ").success).toBe(false);
  });
});
