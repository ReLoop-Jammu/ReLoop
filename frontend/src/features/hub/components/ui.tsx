import type { ComponentProps, ReactNode } from "react";
import { controlClasses } from "@/components/ui/controls";
import { Field, Input as SharedInput, Select as SharedSelect } from "@/components/ui/Field";
import { Stat } from "@/components/ui/Stat";
import { cn } from "@/lib/utils/cn";

/** The hub's compact control style (shared with the site: components/ui/controls.ts). */
export const hubInput = controlClasses({ dense: true });

export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
  actions,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn("rounded-card border border-line bg-surface p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-sans text-base font-semibold tracking-normal">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Hub forms use the shared field and controls, at the compact size. */
export { Field, Stat };

export function Input(props: ComponentProps<"input">) {
  return <SharedInput dense {...props} />;
}

export function Select(props: ComponentProps<"select">) {
  return <SharedSelect dense {...props} />;
}

/** Rupee text field that reports paise. Empty string means "no value". */
export function rupeesToPaiseOrNull(value: string): number | null {
  const n = Number(value.replace(/[^\d.]/g, ""));
  return value.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function paiseToRupeeInput(paise: number | null | undefined): string {
  return paise === null || paise === undefined ? "" : String(paise / 100);
}
