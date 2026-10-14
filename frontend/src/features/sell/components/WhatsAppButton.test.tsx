import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site";
import { WhatsAppButton, whatsappChatUrl } from "./WhatsAppButton";

describe("WhatsAppButton", () => {
  it("opens ReLoop's public number with the message filled in, in a new tab", () => {
    render(<WhatsAppButton message="Hi ReLoop, I'm interested in RL-JMU-0006 Redmi 9" />);
    const link = screen.getByRole("link", { name: /Chat on WhatsApp/ });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin + url.pathname).toBe(`https://wa.me/${SITE.whatsapp}`);
    expect(url.searchParams.get("text")).toBe("Hi ReLoop, I'm interested in RL-JMU-0006 Redmi 9");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("encodes the message", () => {
    expect(whatsappChatUrl("a & b", SITE.whatsapp)).toBe(
      `https://wa.me/${SITE.whatsapp}?text=a%20%26%20b`,
    );
  });
});
