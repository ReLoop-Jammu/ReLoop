// @vitest-environment node
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { inr, isReceiptNo, receiptLines, type Receipt } from "./receipt";

vi.mock("server-only", () => ({}));

const r: Receipt = {
  receipt_no: "RL-PAY-2026-0001",
  paid_at: "2026-11-03",
  amount_paise: 60000,
  method: "upi",
  item_name: "Samsung tablets",
  quantity: 2,
  shop_name: "Sharma Mobiles",
  purchased_at: "2026-11-03T06:00:00Z",
};

describe("payout receipts", () => {
  it("prints what the PDF font can, and says when it couldn't print everything", async () => {
    const { pdfText } = await import("./pdf-text");
    expect(pdfText("TV ₹500 – used")).toEqual({ text: "TV Rs. 500 – used", lossy: false });
    expect(pdfText("Café Électronique")).toEqual({ text: "Café Électronique", lossy: false });
    expect(pdfText("शर्मा मोबाइल Shop")).toEqual({ text: "Shop", lossy: true });
    expect(pdfText("शर्मा")).toEqual({ text: "(see your account)", lossy: true });
  });

  it("makes the PDF even with Hindi and emoji in the names", async () => {
    const { receiptPdf } = await import("./receipt-pdf");
    const bytes = await receiptPdf({
      ...r,
      shop_name: "शर्मा मोबाइल",
      item_name: "पुराने फ़ोन 📱 ₹500",
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("checks receipt numbers", () => {
    expect(isReceiptNo("RL-PAY-2026-0001")).toBe(true);
    expect(isReceiptNo("RL-PAY-2026-1")).toBe(false);
    expect(isReceiptNo("../etc")).toBe(false);
  });

  it("prints who, what, how much, how and when, in rupees without the symbol", () => {
    expect(inr(123450)).toBe("INR 1,234.50");
    expect(receiptLines(r)).toEqual([
      ["Receipt number", "RL-PAY-2026-0001"],
      ["Date paid", "3 November 2026"],
      ["Paid to", "Sharma Mobiles"],
      ["For", "Samsung tablets (2 items)"],
      ["Bought on", "3 November 2026"],
      ["Amount", "INR 600.00"],
      ["Paid by", "UPI"],
    ]);
  });

  it("makes a one-page A5 PDF titled with the receipt number", async () => {
    const { receiptPdf } = await import("./receipt-pdf");
    const bytes = await receiptPdf(r);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("ReLoop payment receipt RL-PAY-2026-0001");
    const [w, h] = [doc.getPage(0).getWidth(), doc.getPage(0).getHeight()];
    expect([Math.round(w), Math.round(h)]).toEqual([420, 595]);
  });
});
