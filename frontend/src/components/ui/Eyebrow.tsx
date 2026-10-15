import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = { children: ReactNode; className?: string; tone?: "light" | "dark" };

/** A short section label in sentence case, shown as a small pill with a dot. */
export function Eyebrow({ children, className, tone = "light" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
        tone === "light"
          ? "bg-brand-50 text-brand-600 ring-1 ring-brand-100 ring-inset"
          : "bg-white/10 text-gold-400 ring-1 ring-white/15 ring-inset",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", tone === "light" ? "bg-gold-500" : "bg-gold-400")}
      />
      {children}
    </span>
  );
}
