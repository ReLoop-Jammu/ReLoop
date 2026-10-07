import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";

type Props = { icon: LucideIcon; eyebrow: string; title: string; children: ReactNode };

export function SellPageHeader({ icon: Icon, eyebrow, title, children }: Props) {
  return (
    <div className="max-w-3xl">
      <Link
        href="/sell"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All ways to sell
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h1>
      <div className="mt-4 text-lg leading-relaxed text-muted">{children}</div>
    </div>
  );
}

export function BenefitList({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((b) => (
        <li key={b.title} className="rounded-card border border-line bg-surface p-5 shadow-soft">
          <p className="font-semibold text-ink">{b.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{b.body}</p>
        </li>
      ))}
    </ul>
  );
}
