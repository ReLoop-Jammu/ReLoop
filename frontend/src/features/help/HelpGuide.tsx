"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";
import { useSiteSettings } from "@/features/settings/context";
import { GUIDE, GUIDE_VALUES, guideParts, type Lang } from "./guide";

const KEY = "reloop-help-lang";

function storedLang(): Lang {
  try {
    return localStorage.getItem(KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en"; // Storage blocked: English.
  }
}
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** The shop-owner guide with an English / Hindi toggle (remembered in this browser only). */
export function HelpGuide() {
  const site = useSiteSettings();
  // The contact details come from the settings (the Hindi hours stay as written).
  const values = {
    ...GUIDE_VALUES,
    whatsapp: site.supportPhone ?? GUIDE_VALUES.whatsapp,
    hours: site.hours ?? "",
  };
  const stored = useSyncExternalStore(subscribe, storedLang, () => "en" as Lang);
  // The choice made on this page wins, even when storage is blocked.
  const [picked, setPicked] = useState<Lang | null>(null);
  const lang = picked ?? stored;
  const choose = (l: Lang) => {
    setPicked(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  };

  return (
    <>
      <div
        role="group"
        aria-label="Language"
        className="mt-6 inline-flex rounded-full border border-line bg-surface p-1"
      >
        {(
          [
            ["en", "English", "en"],
            ["hi", "हिन्दी", "hi"],
          ] as const
        ).map(([value, label, labelLang]) => (
          <button
            key={value}
            type="button"
            lang={labelLang}
            aria-pressed={lang === value}
            onClick={() => choose(value)}
            className={cn(
              "min-h-10 rounded-full px-5 text-sm font-semibold transition",
              lang === value ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-sunken",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div lang={lang} className="mt-8 max-w-3xl">
        <p className="text-lg leading-relaxed text-muted">{GUIDE.intro[lang]}</p>
        {lang === "hi" && (
          <p className="mt-3 text-sm text-muted">
            बटन और स्टेटस के नाम अंग्रेज़ी में हैं, क्योंकि वेबसाइट पर वे अंग्रेज़ी में ही दिखते
            हैं।
          </p>
        )}
        <ol className="mt-8 grid gap-6" role="list">
          {GUIDE.sections.map((s) => (
            <li
              key={s.id}
              id={s.id}
              className="rounded-card border border-line bg-surface p-6 shadow-soft"
            >
              <h2 className="text-xl font-bold">{s[lang].title}</h2>
              <ul className="mt-3 grid list-disc gap-2 pl-5 leading-relaxed text-ink-soft">
                {s[lang].steps.map((step) => (
                  <li key={step}>
                    {guideParts(step, values).map((p, i) =>
                      "path" in p ? (
                        <Link
                          key={i}
                          href={p.path}
                          className="font-semibold text-brand-600 underline"
                          lang="en"
                        >
                          {p.path}
                        </Link>
                      ) : (
                        <span key={i}>{p.text}</span>
                      ),
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
