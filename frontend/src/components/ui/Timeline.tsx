import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type TimelineEntry = {
  key: string;
  when: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  current?: boolean;
};

/** A vertical sequence of dated steps (an item's journey, a request's progress). */
export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn("relative grid gap-5 border-l-2 border-line pl-6", className)}>
      {entries.map((e) => (
        <li key={e.key} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1.5 -left-[31px] size-3 rounded-full border-2 border-surface",
              e.current ? "bg-gold-500" : "bg-brand-600",
            )}
          />
          <p className="text-xs text-muted">{e.when}</p>
          <p className="font-semibold text-ink">{e.title}</p>
          {e.detail && <p className="mt-0.5 text-sm text-ink-soft">{e.detail}</p>}
        </li>
      ))}
    </ol>
  );
}
