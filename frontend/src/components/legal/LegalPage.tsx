import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

type Props = { title: string; updated: string; children: ReactNode };

/** Shared layout for policy pages: readable line length and consistent typography. */
export function LegalPage({ title, updated, children }: Props) {
  const date = new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <Container className="py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated {date}</p>
        <div className="mt-6 rounded-card border border-gold-400/60 bg-gold-100 p-4 text-sm leading-relaxed text-gold-700">
          <strong>Draft.</strong> This page is a working draft while ReLoop is in early preview. It
          will be reviewed by a legal professional before full launch.
        </div>
        <div className="mt-10 space-y-8 leading-relaxed text-ink-soft [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </Container>
  );
}

/** Shows a contact detail, or a neutral note if the team hasn't confirmed it yet. */
export function ContactDetail({
  value,
  href,
}: {
  value: string | null;
  href?: (v: string) => string;
}) {
  if (!value) return <span className="text-muted italic">to be published before launch</span>;
  return href ? (
    <a href={href(value)} className="font-medium text-brand-600 underline">
      {value}
    </a>
  ) : (
    <span>{value}</span>
  );
}
