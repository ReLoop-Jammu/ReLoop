import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = { children: ReactNode; className?: string; tone?: "light" | "dark" };

/** Small label above headings. */
export function Eyebrow({ children, className, tone = "light" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase",
        tone === "light" ? "text-brand-600" : "text-gold-400",
        className,
      )}
    >
      <span
        className={cn("h-px w-6", tone === "light" ? "bg-brand-600" : "bg-gold-400")}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
