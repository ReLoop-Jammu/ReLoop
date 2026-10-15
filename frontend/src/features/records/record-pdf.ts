import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { SITE } from "@/lib/site";
import { pdfText } from "@/features/payouts/pdf-text";
import { recordText, type HandoverRecord } from "./record";

const NAVY = rgb(0x26 / 255, 0x43 / 255, 0x6c / 255);
const INK = rgb(0x0e / 255, 0x1a / 255, 0x27 / 255);
const MUTED = rgb(0x56 / 255, 0x66 / 255, 0x7a / 255);

/** An A4 handover record for an institution's lot: tags bought, and the partner's weights and receipt. */
export async function handoverRecordPdf(r: HandoverRecord): Promise<Uint8Array> {
  const t = recordText(r);
  const doc = await PDFDocument.create();
  doc.setTitle(`Handover record, ${r.institution}`);
  doc.setAuthor(SITE.name);
  doc.setCreator("ReLoop");
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const W = 595.28;
  const H = 841.89;
  const left = 48;
  let page = doc.addPage([W, H]);
  let y = H - 60;
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: NAVY });

  const write = (text: string, size = 11, font = regular, color = INK, gap = 6) => {
    const safe = pdfText(text).text;
    const words = safe.split(" ");
    let line = "";
    const flush = () => {
      if (y < 70) {
        page = doc.addPage([W, H]);
        y = H - 60;
      }
      page.drawText(line, { x: left, y, size, font, color });
      y -= size + gap;
    };
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > W - 2 * left && line) {
        flush();
        line = w;
      } else line = next;
    }
    if (line) flush();
  };

  write("ReLoop", 22, bold, NAVY, 4);
  write(`${SITE.name}, ${SITE.city}`, 9, regular, MUTED, 18);
  write(t.title, 16, bold, INK, 10);
  write(t.intro);
  y -= 8;
  write("Items bought", 12, bold, INK, 6);
  if (t.bought.length) for (const line of t.bought) write(line, 10);
  else write(t.boughtNone, 10, regular, MUTED);
  y -= 8;
  write("Handed to our dismantling partner", 12, bold, INK, 6);
  write(t.handedOver, 10);
  for (const line of t.kg) write(line, 10);
  if (t.total) write(t.total, 10, bold);
  y -= 12;
  write(t.footer, 9, regular, MUTED);
  return doc.save();
}
