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
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h1>
        <div className="mt-5 text-lg leading-relaxed text-ink-soft">{lead}</div>
        {children}
        <div className="mt-10 grid gap-8 leading-relaxed text-ink-soft">
          {sections.map((s, i) => (
            <section key={s.title}>
              <h2 className="text-xl font-semibold text-ink">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-2 space-y-3">{s.body}</div>
            </section>
          ))}
        </div>
      </article>
    </Container>
  );
}
