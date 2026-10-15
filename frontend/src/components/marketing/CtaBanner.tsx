import type { ReactNode } from "react";

type Props = { eyebrow?: string; title: string; description: string; actions: ReactNode };

export function CtaBanner({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="relative overflow-hidden rounded-panel bg-gradient-to-br from-gold-400 to-gold-500 px-6 py-12 shadow-lift sm:px-14 sm:py-16">
      <div
        className="absolute -top-24 -right-16 size-72 rounded-full bg-gold-500/40"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/20"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          {eyebrow && <p className="text-sm font-semibold text-brand-950">{eyebrow}</p>}
          <h2 className="mt-2 text-3xl leading-[1.05] font-bold text-brand-950 sm:text-5xl">
            {title}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-brand-950">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">{actions}</div>
      </div>
    </div>
  );
}
