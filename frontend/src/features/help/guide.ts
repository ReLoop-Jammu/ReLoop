import { LOCATIONS } from "@/config/locations";
import { SITE } from "@/lib/site";
import guide from "./guide.json";

export type Lang = "en" | "hi";
export const GUIDE = guide;

const DAYS_HI: Record<string, string> = { Tuesday: "मंगलवार", Friday: "शुक्रवार" };

/** Values the guide's {placeholders} stand for, from the site config. */
export const GUIDE_VALUES: Record<string, string> = {
  days: LOCATIONS.route.days.join(" and "),
  days_hi: LOCATIONS.route.days.map((d) => DAYS_HI[d] ?? d).join(" और "),
  whatsapp: SITE.supportPhone ?? "see the contact page",
  hours: SITE.hours ?? "",
  hours_hi: `नवंबर 2026 से सोम–शनि, सुबह 10 से शाम 6 बजे तक। तब तक हम एक कामकाजी दिन के अंदर WhatsApp पर जवाब देते हैं।`,
};

export type Part = { text: string } | { path: string };

/** Splits a step into text and site paths ("{site}/account" → a link to /account). */
export function guideParts(step: string, values: Record<string, string> = GUIDE_VALUES): Part[] {
  const filled = step.replace(
    /\{(days|days_hi|whatsapp|hours|hours_hi)\}/g,
    (_, k: string) => values[k] ?? GUIDE_VALUES[k],
  );
  return filled
    .split(/\{site\}(\/[a-z/-]*)/)
    .map((piece, i) => (i % 2 ? { path: piece } : { text: piece }))
    .filter((p) => !("text" in p) || p.text !== "");
}

/** The guide as Markdown, English and Hindi side by side (docs/report/shop-owner-guide.md). */
export function guideMarkdown(): string {
  const md = (step: string) =>
    guideParts(step)
      .map((p) => ("path" in p ? `\`${p.path}\`` : p.text.replace(/\|/g, "\\|")))
      .join("");
  const out = [
    "# Shop owner guide",
    "",
    "_Generated from `frontend/src/features/help/guide.json`, which also drives the public `/help` page. Edit the JSON, then run `npm run help-guide -w frontend`._",
    "",
    "> **Hindi: to be checked by a native speaker.** The Hindi was written by the development team and has not yet been reviewed. Button and status names stay in English because the site shows them in English.",
    "",
    `${GUIDE.intro.en}`,
    "",
    `${GUIDE.intro.hi}`,
    "",
  ];
  for (const s of GUIDE.sections) {
    out.push(
      `## ${s.en.title} / ${s.hi.title.replace(/^\d+\.\s*/, "")}`,
      "",
      "| English | हिन्दी |",
      "| --- | --- |",
    );
    const n = Math.max(s.en.steps.length, s.hi.steps.length);
    for (let i = 0; i < n; i++)
      out.push(`| ${md(s.en.steps[i] ?? "")} | ${md(s.hi.steps[i] ?? "")} |`);
    out.push("");
  }
  return out.join("\n");
}
