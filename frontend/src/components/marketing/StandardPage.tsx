import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

export type StandardSection = { title: string; body: ReactNode };

/** A plain, readable standards or policy page: an eyebrow, a heading, a lead and numbered sections. */
export function StandardPage({
  eyebrow = "Our standards",
  title,
  lead,
  sections,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead: ReactNode;
  sections: StandardSection[];
  children?: ReactNode;
}) {
  return (
    <Container className="py-12 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <Eyebrow>
          {eyebrow === "Our standards" ? (
            <Link href="/standards" className="underline-offset-2 hover:underline">
              Our standards
            </Link>
          ) : (
            eyebrow
          )}
        </Eyebrow>
        <h1 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-6xl">{title}</h1>
        <div className="mt-5 text-lg leading-relaxed text-ink-soft">{lead}</div>
        {children}
        <div className="mt-10 grid gap-5 leading-relaxed text-ink-soft">
          {sections.map((s, i) => (
            <section
              key={s.title}
              className="rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8"
            >
              <h2 className="flex items-center gap-3 text-xl font-semibold text-ink">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-mesh font-sans text-sm text-gold-400"
                >
                  {i + 1}
                </span>
                <span>
                  <span className="sr-only">{i + 1}. </span>
                  {s.title}
                </span>
              </h2>
              <div className="mt-2 space-y-3">{s.body}</div>
            </section>
          ))}
        </div>
      </article>
    </Container>
  );
}
