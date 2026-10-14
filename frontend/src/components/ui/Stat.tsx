import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** One figure with its label, and optionally a target and whether it is met. */
export function Stat({
  label,
  value,
  hint,
  target,
  ok,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  target?: string;
  ok?: boolean | null;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-4", className)}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {target && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            ok === true ? "text-success" : ok === false ? "text-warning" : "text-muted",
          )}
        >
          Target {target}
          {ok === true && <span className="sr-only"> (met)</span>}
          {ok === false && <span className="sr-only"> (not met yet)</span>}
        </p>
      )}
    </div>
  );
}
