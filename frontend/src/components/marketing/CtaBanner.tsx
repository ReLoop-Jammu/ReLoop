import type { ReactNode } from "react";

type Props = { eyebrow?: string; title: string; description: string; actions: ReactNode };

export function CtaBanner({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="relative overflow-hidden rounded-panel bg-gold-500 px-6 py-10 sm:px-12 sm:py-14">
      <div
        className="absolute -top-24 -right-16 size-72 rounded-full bg-gold-400"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/20"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-950/70 uppercase">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-2 text-3xl font-bold text-brand-950 sm:text-4xl">{title}</h2>
          <p className="mt-3 text-lg leading-relaxed text-brand-950/75">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">{actions}</div>
      </div>
    </div>
  );
}
