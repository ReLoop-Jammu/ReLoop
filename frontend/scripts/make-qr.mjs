// Generates the printable awareness-drive QR code from DRIVE_LINK.publicUrl in
// src/config/locations.ts, into public/qr/. Run: npm run qr -w frontend
import { readFileSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";

const config = readFileSync(new URL("../src/config/locations.ts", import.meta.url), "utf8");
const url = config.match(/publicUrl:\s*"([^"]+)"/)?.[1];
if (!url?.startsWith("https://")) throw new Error("DRIVE_LINK.publicUrl not found in locations.ts");

const options = {
  errorCorrectionLevel: "M",
  margin: 2,
  color: { dark: "#0b2b26", light: "#ffffff" },
};
const out = (name) => new URL(`../public/qr/${name}`, import.meta.url);
writeFileSync(out("awareness-drive.svg"), await QRCode.toString(url, { ...options, type: "svg" }));
await QRCode.toFile(out("awareness-drive.png").pathname, url, { ...options, width: 1200 });
console.log(`QR code for ${url} written to public/qr/`);

// The printed scrap prices and counter card point at /go/rate-card (counted, then
// redirected to /rate-card). The public site address is the same as the drive link's.
const origin = new URL(url).origin;
const rateUrl = `${origin}/go/rate-card`;
writeFileSync(out("rate-card.svg"), await QRCode.toString(rateUrl, { ...options, type: "svg" }));
await QRCode.toFile(out("rate-card.png").pathname, rateUrl, { ...options, width: 1200 });
console.log(`QR code for ${rateUrl} written to public/qr/`);

// The partner window badge points at /go/partner-badge (counted, then /locations).
const badgeUrl = `${origin}/go/partner-badge`;
writeFileSync(
  out("partner-badge.svg"),
  await QRCode.toString(badgeUrl, { ...options, type: "svg" }),
);
await QRCode.toFile(out("partner-badge.png").pathname, badgeUrl, { ...options, width: 1200 });
console.log(`QR code for ${badgeUrl} written to public/qr/`);
