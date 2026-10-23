import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { PUBLIC_SITE } from "@/config/tracked-links";
import { pdfText } from "@/features/payouts/pdf-text";

const MM = 72 / 25.4;
const NAVY = rgb(0x26 / 255, 0x43 / 255, 0x6c / 255);
const INK = rgb(0x0e / 255, 0x1a / 255, 0x27 / 255);

/** The passport address a tag's QR code opens. */
export const passportUrl = (id: string) => `${PUBLIC_SITE}/passport/${id}`;

/**
 * One 62 × 29 mm label (one per page, for a label printer): the QR code to
 * the item's passport, the item number in large type, and what the item is.
 */
export async function tagPdf(id: string, kind: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`ReLoop tag ${id}`);
  doc.setCreator("ReLoop");
  const w = 62 * MM;
  const h = 29 * MM;
  const page = doc.addPage([w, h]);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const margin = 2 * MM;
  const qrSize = h - 2 * margin;
  const png = await QRCode.toBuffer(passportUrl(id), {
    margin: 0,
    width: 300,
    errorCorrectionLevel: "M",
  });
  page.drawImage(await doc.embedPng(png), { x: margin, y: margin, width: qrSize, height: qrSize });

  const x = margin + qrSize + 2.5 * MM;
  const room = w - x - margin;
  page.drawText("ReLoop", { x, y: h - margin - 8, size: 8, font: bold, color: NAVY });
  // The tag in the largest size that fits.
  let size = 13;
  while (size > 7 && mono.widthOfTextAtSize(id, size) > room) size -= 0.5;
  page.drawText(id, { x, y: h / 2 - size / 3, size, font: mono, color: INK });
  page.drawText(pdfText(kind).text.slice(0, 28), {
    x,
    y: margin + 8,
    size: 6.5,
    font: regular,
    color: INK,
  });
  page.drawText("Scan for its passport", {
    x,
    y: margin + 1,
    size: 5.5,
    font: regular,
    color: NAVY,
  });
  return doc.save();
}
