import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { WhatsAppButton } from "./WhatsAppButton";

type Props = { icon: LucideIcon; eyebrow: ReactNode; title: ReactNode; children: ReactNode };

export function SellPageHeader({ icon: Icon, eyebrow, title, children }: Props) {
  return (
    <div className="max-w-3xl">
      <Link
        href="/sell"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />{" "}
        <T en="All ways to sell" hi="बेचने के सभी तरीक़े" />
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h1>
      <div className="mt-4 text-lg leading-relaxed text-muted">{children}</div>
      <SellQuickLinks />
    </div>
  );
}

/** "What we accept" and a WhatsApp chat, on every sell page. */
export function SellQuickLinks() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
      <WhatsAppButton
        message="Hi ReLoop, I run a shop or represent an institution and would like to sell to ReLoop. Our name is: "
        label={<T en="Chat on WhatsApp" hi="WhatsApp पर बात करें" />}
      />
      <Link href="/what-we-accept" className="font-semibold text-brand-600 underline">
        <T en="What we accept" hi="हम क्या लेते हैं" />
      </Link>
    </div>
  );
}

export function BenefitList({ items }: { items: { title: ReactNode; body: ReactNode }[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((b, i) => (
        <li key={i} className="rounded-card border border-line bg-surface p-5 shadow-soft">
          <p className="font-semibold text-ink">{b.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{b.body}</p>
        </li>
      ))}
    </ul>
  );
}
