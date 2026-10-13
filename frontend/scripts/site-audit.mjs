// Crawls a ReLoop site from its home page and reports broken internal links
// and browser console errors or warnings on every page it reaches.
//
//   node scripts/site-audit.mjs <base-url> [--max=400] [--json=out.json]
//
// Only follows same-origin links. Short links (/go/…) are checked with a HEAD
// request, which the route never counts as a visit. Read-only: it only loads
// pages, so it is safe to run against production.
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const base = new URL(args.find((a) => !a.startsWith("--")) ?? "http://localhost:3100");
const max = Number(args.find((a) => a.startsWith("--max="))?.slice(6) ?? 400);
const jsonOut = args.find((a) => a.startsWith("--json="))?.slice(7);

const SKIP = [/^\/_next\//, /^\/_vercel\//, /\.(png|jpe?g|svg|webp|ico|pdf|csv|txt|xml|json)$/i];
const normalise = (href) => {
  const u = new URL(href, base);
  u.hash = "";
  return u;
};

const browser = await chromium.launch();
const context = await browser.newContext();
const queue = [new URL("/", base)];
const seen = new Set(queue.map((u) => u.pathname + u.search));
const broken = [];
const consoleIssues = [];
const goLinks = new Set();
const assets = new Set();

while (queue.length && seen.size <= max) {
  const url = queue.shift();
  const page = await context.newPage();
  const issues = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      issues.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => issues.push(`pageerror: ${String(e).slice(0, 300)}`));
  let status = 0;
  try {
    const res = await page.goto(url.href, { waitUntil: "networkidle", timeout: 45_000 });
    status = res?.status() ?? 0;
  } catch (e) {
    issues.push(`navigation: ${String(e).slice(0, 200)}`);
  }
  if (status >= 400 || status === 0) broken.push({ url: url.pathname + url.search, status });
  if (issues.length) consoleIssues.push({ url: url.pathname + url.search, issues });
  const hrefs = await page
    .$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")))
    .catch(() => []);
  for (const href of hrefs) {
    if (!href || /^(mailto:|tel:|javascript:|#)/.test(href)) continue;
    const u = normalise(href);
    if (u.origin !== base.origin) continue;
    if (u.pathname.startsWith("/go/")) {
      goLinks.add(u.pathname);
      continue;
    }
    if (SKIP.some((re) => re.test(u.pathname))) {
      assets.add(u.pathname);
      continue;
    }
    const key = u.pathname + u.search;
    if (!seen.has(key)) {
      seen.add(key);
      queue.push(u);
    }
  }
  await page.close();
}
await browser.close();

// Files linked from pages (PDFs, CSVs, images) must exist too.
for (const path of assets) {
  const res = await fetch(new URL(path, base), { method: "HEAD" }).catch(() => null);
  if (!res || res.status >= 400) broken.push({ url: path, status: res?.status ?? 0 });
}
const goResults = [];
for (const path of goLinks) {
  const res = await fetch(new URL(path, base), { method: "HEAD", redirect: "manual" }).catch(
    () => null,
  );
  goResults.push({ url: path, status: res?.status ?? 0, location: res?.headers.get("location") });
  if (!res || res.status !== 307) broken.push({ url: path, status: res?.status ?? 0 });
}

const report = { base: base.origin, pages: seen.size, broken, consoleIssues, goLinks: goResults };
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));
console.log(`Crawled ${seen.size} pages on ${base.origin}`);
console.log(`Broken links: ${broken.length}`);
for (const b of broken) console.log(`  ${b.status} ${b.url}`);
console.log(`Pages with console errors or warnings: ${consoleIssues.length}`);
for (const c of consoleIssues) {
  console.log(`  ${c.url}`);
  for (const i of c.issues.slice(0, 5)) console.log(`    ${i}`);
}
console.log(`Short links checked: ${goResults.length}`);
process.exitCode = broken.length || consoleIssues.length ? 1 : 0;
