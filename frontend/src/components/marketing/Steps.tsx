import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type Step = { title: ReactNode; body?: ReactNode; icon?: LucideIcon };

type Props = {
  steps: Step[];
  /** Dark for the navy panels on the home page. */
  tone?: "light" | "dark";
  /** Columns from large screens up; steps stack on phones. */
  columns?: 3 | 4 | 5 | 6;
  className?: string;
};

const COLS = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-3 xl:grid-cols-6",
};

/**
 * The one numbered-steps component: how selling works for shops and
 * institutions, how to buy, and the loop on the home page. An ordered list, so
 * screen readers announce "1 of 6" without the visual numbers.
 */
export function Steps({ steps, tone = "light", columns = 4, className }: Props) {
  const dark = tone === "dark";
  return (
    <ol className={cn("grid gap-4 sm:grid-cols-2", COLS[columns], className)}>
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <li
            key={i}
            className={cn(
              "relative rounded-card p-5",
              dark
                ? "bg-white/[0.06] ring-1 ring-white/15 ring-inset"
                : "border border-line bg-surface shadow-soft",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-500 font-display text-base font-bold text-brand-950"
              >
                {i + 1}
              </span>
              {Icon && (
                <Icon
                  className={cn("size-5", dark ? "text-gold-400" : "text-brand-600")}
                  aria-hidden="true"
                />
              )}
            </div>
            <h3 className={cn("mt-3 text-lg leading-snug font-semibold", dark && "text-white")}>
              {step.title}
            </h3>
            {step.body && (
              <p
                className={cn(
                  "mt-1.5 text-sm leading-relaxed",
                  dark ? "text-white/75" : "text-muted",
                )}
              >
                {step.body}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
