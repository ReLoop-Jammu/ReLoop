import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const hubInput =
  "min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink transition placeholder:text-muted hover:border-line-strong focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none";

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
    <section
      className={cn("rounded-card border border-line bg-surface p-5 shadow-soft", className)}
    >
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

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
};

/**
 * Label + control. The control is nested inside the <label>, so it is
 * always associated, even without an id. Pass htmlFor only to override.
 */
export function Field({ label, hint, children, className, htmlFor }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</span>
        {children}
      </label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cn(hubInput, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cn(hubInput, props.className)} />;
}

export function Stat({
  label,
  value,
  target,
  ok,
}: {
  label: string;
  value: string;
  target?: string;
  ok?: boolean | null;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
      {target && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            ok === true ? "text-grade-a" : ok === false ? "text-grade-c" : "text-muted",
          )}
        >
          Target {target}
        </p>
      )}
    </div>
  );
}

/** Rupee text field that reports paise. Empty string means "no value". */
export function rupeesToPaiseOrNull(value: string): number | null {
  const n = Number(value.replace(/[^\d.]/g, ""));
  return value.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function paiseToRupeeInput(paise: number | null | undefined): string {
  return paise === null || paise === undefined ? "" : String(paise / 100);
}
