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
