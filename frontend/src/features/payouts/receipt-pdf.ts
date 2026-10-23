import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { PUBLIC_SITE } from "@/config/tracked-links";
import { SITE } from "@/lib/site";
import { pdfText } from "./pdf-text";
import { receiptLines, type Receipt } from "./receipt";

const NAVY = rgb(0x26 / 255, 0x43 / 255, 0x6c / 255);
const INK = rgb(0x0e / 255, 0x1a / 255, 0x27 / 255);
const MUTED = rgb(0x56 / 255, 0x66 / 255, 0x7a / 255);

/**
 * An A5 payment receipt for a shop: who was paid, for what, how much, how and
 * when, with a QR code to the shop's account. No payment reference or staff
 * note (those stay in the hub), and no claim beyond the payment itself.
 */
export async function receiptPdf(r: Receipt): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`ReLoop payment receipt ${r.receipt_no}`);
  doc.setAuthor(SITE.name);
  doc.setCreator("ReLoop");
  doc.setSubject("Payment for items bought by ReLoop");
  const page = doc.addPage([419.53, 595.28]); // A5 portrait, in points
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const left = 36;
  let y = 595.28 - 48;

  page.drawRectangle({ x: 0, y: 595.28 - 8, width: 419.53, height: 8, color: NAVY });
  page.drawText("ReLoop", { x: left, y, size: 22, font: bold, color: NAVY });
  page.drawText("Payment receipt", { x: left, y: (y -= 24), size: 14, font: bold, color: INK });
  page.drawText(`${SITE.name}, ${SITE.city}`, {
    x: left,
    y: (y -= 16),
    size: 9,
    font: regular,
    color: MUTED,
  });

  y -= 28;
  let lossy = false;
  for (const [label, raw] of receiptLines(r)) {
    page.drawText(label, { x: left, y, size: 9, font: regular, color: MUTED });
    const safe = pdfText(raw);
    lossy ||= safe.lossy;
    // Long values wrap onto a second line.
    const words = safe.text.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (bold.widthOfTextAtSize(next, 11) > 230 && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    lines.push(line);
    lines.forEach((l, i) =>
      page.drawText(l, { x: left + 112, y: y - i * 14, size: 11, font: bold, color: INK }),
    );
    y -= 14 * lines.length + 10;
  }

  y -= 6;
  page.drawLine({
    start: { x: left, y },
    end: { x: 419.53 - left, y },
    thickness: 0.5,
    color: MUTED,
  });
  y -= 18;
  for (const text of [
    r.line === "scrap"
      ? "Scrap was weighed in front of the shop and paid at our scrap prices on the day."
      : "ReLoop bought these items outright. This receipt confirms the payment above.",
    ...(r.declaration ? [r.declaration] : []),
    "It is not a tax invoice.",
    ...(lossy
      ? ["Some characters in a name can't be printed here; your account shows it in full."]
      : []),
  ]) {
    page.drawText(text, { x: left, y, size: 9, font: regular, color: INK });
    y -= 13;
  }

  const account = `${PUBLIC_SITE}/account`;
  const png = await QRCode.toBuffer(account, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  const qr = await doc.embedPng(png);
  page.drawImage(qr, { x: left, y: 48, width: 84, height: 84 });
  page.drawText("All your receipts and offers:", {
    x: left + 98,
    y: 110,
    size: 9,
    font: regular,
    color: MUTED,
  });
  page.drawText(account.replace(/^https:\/\//, ""), {
    x: left + 98,
    y: 96,
    size: 9,
    font: bold,
    color: NAVY,
  });
  if (SITE.supportPhone)
    page.drawText(pdfText(`Questions: WhatsApp ${SITE.supportPhone}`).text, {
      x: left + 98,
      y: 76,
      size: 9,
      font: regular,
      color: MUTED,
    });
  return doc.save();
}
