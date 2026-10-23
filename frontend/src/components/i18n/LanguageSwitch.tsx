"use client";

import { useSyncExternalStore } from "react";
import { currentLang, LANG_EVENT, setLang, type Lang } from "@/lib/lang";
import { cn } from "@/lib/utils/cn";

const subscribe = (onChange: () => void) => {
  window.addEventListener(LANG_EVENT, onChange);
  return () => window.removeEventListener(LANG_EVENT, onChange);
};

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: "en", label: "English" },
  { lang: "hi", label: "हिन्दी" },
];

/** English / हिन्दी, remembered in this browser. */
export function LanguageSwitch({ className }: { className?: string }) {
  // English while server-rendering; the boot script has already set the real choice.
  const lang = useSyncExternalStore(subscribe, currentLang, () => "en" as Lang);
  return (
    <div
      role="group"
      aria-label="Language / भाषा"
      className={cn("inline-flex rounded-full bg-white/10 p-0.5 ring-1 ring-white/20", className)}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          lang={o.lang}
          aria-pressed={lang === o.lang}
          onClick={() => setLang(o.lang)}
          className={cn(
            "min-h-8 rounded-full px-3 text-sm font-semibold transition",
            lang === o.lang ? "bg-white text-brand-950" : "text-white hover:bg-white/15",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
