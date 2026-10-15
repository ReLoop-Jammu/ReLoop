// Prints the A4 outreach sheets (src/app/(print)/print/*) to PDF in
// public/print/, from the local production build. The pages are the source
// files; edit them, then run: npm run build -w frontend && npm run print -w frontend
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const SHEETS = [
  ["counter-card", "A4"],
  ["awareness-flyer", "A4"],
  ["partner-badge", "A5"],
];
const PORT = 3310;
const base = `http://localhost:${PORT}`;

// CI=true lets the build run without Supabase (see features/shop/queries.ts).
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, CI: "true" },
  stdio: "ignore",
});
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (i > 60) throw new Error("next start didn't come up; run npm run build first");
    await new Promise((r) => setTimeout(r, 500));
  }
  // PLAYWRIGHT_CHROMIUM_PATH points at a browser already on the machine (cloud sessions).
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH && {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
    }),
  });
  const page = await browser.newPage();
  for (const [name, format] of SHEETS) {
    await page.goto(`${base}/print/${name}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const path = new URL(`../public/print/${name}.pdf`, import.meta.url).pathname;
    await page.pdf({ path, format, printBackground: true, preferCSSPageSize: true });
    console.log(`public/print/${name}.pdf`);
  }
  await browser.close();
} finally {
  server.kill();
}
