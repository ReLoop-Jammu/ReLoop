import type { ReactNode } from "react";

/**
 * Text in English and Hindi; the language switch shows one (see lib/lang.ts).
 * The hidden one is `display: none`, so screen readers and the heading outline
 * only ever get the visible language. Hindi is marked `lang="hi"` for voices and fonts.
 */
export function T({ en, hi }: { en: ReactNode; hi: ReactNode }) {
  return (
    <>
      <span data-l="en">{en}</span>
      <span data-l="hi" lang="hi">
        {hi}
      </span>
    </>
  );
}

/** Whole blocks (paragraphs, lists) in English and Hindi. */
export function Bi({ en, hi }: { en: ReactNode; hi: ReactNode }) {
  return (
    <>
      <div data-l="en" className="contents">
        {en}
      </div>
      <div data-l="hi" lang="hi" className="contents">
        {hi}
      </div>
    </>
  );
}

/**
 * Marks a page as translated. Without it, a visitor who chose Hindi sees a
 * short note that the page is in English only (SiteLayout).
 */
export function HindiPage() {
  return <span data-hi-page hidden />;
}
