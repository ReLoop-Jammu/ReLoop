import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { SITE } from "@/lib/site";
import { MONTH_COLUMNS, num, type MonthRow } from "./model";

const NAVY = rgb(0x26 / 255, 0x43 / 255, 0x6c / 255);
const INK = rgb(0x0e / 255, 0x1a / 255, 0x27 / 255);
const MUTED = rgb(0x56 / 255, 0x66 / 255, 0x7a / 255);

/** A one-page A4 monthly report: the month's public figures, as on the web page. */
export async function monthlyReportPdf(title: string, row: MonthRow): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`ReLoop monthly report: ${title}`);
  doc.setAuthor(SITE.name);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const W = 595.28;
  const H = 841.89;
  const page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: NAVY });
  let y = H - 60;
  page.drawText("ReLoop", { x: 48, y, size: 22, font: bold, color: NAVY });
  page.drawText(`Monthly report: ${title}`, {
    x: 48,
    y: (y -= 30),
    size: 16,
    font: bold,
    color: INK,
  });
  page.drawText("Counts and kilograms from weighed and tagged records. No names or prices.", {
    x: 48,
    y: (y -= 18),
    size: 9,
    font: regular,
    color: MUTED,
  });
  y -= 24;
  for (const [key, label] of MONTH_COLUMNS) {
    if (key === "month") continue;
    page.drawText(label, { x: 48, y, size: 11, font: regular, color: INK });
    const v = String(num(row[key as keyof MonthRow]));
    page.drawText(v, {
      x: W - 48 - bold.widthOfTextAtSize(v, 11),
      y,
      size: 11,
      font: bold,
      color: INK,
    });
    y -= 22;
  }
  return doc.save();
}
