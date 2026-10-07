import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site", () => ({
  SITE: { whatsapp: "919000000000", supportEmail: "hello@example.in" },
}));
const { buildRequestText, handoffChannels, isValidPhone } = await import("./handoff");

describe("request handoff", () => {
  it("builds a readable message, skipping empty fields", () => {
    expect(
      buildRequestText("Partner sign-up", [
        ["Shop", "Sharma Mobiles"],
        ["Notes", " "],
      ]),
    ).toBe("ReLoop: Partner sign-up\n\nShop: Sharma Mobiles");
  });

  it("creates WhatsApp and email links with the message encoded", () => {
    const [wa, mail] = handoffChannels("Subject", "Hi & bye");
    expect(wa.href).toBe("https://wa.me/919000000000?text=Hi%20%26%20bye");
    expect(mail.href).toBe("mailto:hello@example.in?subject=Subject&body=Hi%20%26%20bye");
  });

  it("accepts Indian phone formats", () => {
    expect(isValidPhone("98765 43210")).toBe(true);
    expect(isValidPhone("+91 98765 43210")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("call me")).toBe(false);
  });
});
