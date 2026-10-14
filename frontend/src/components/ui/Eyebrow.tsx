import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = { children: ReactNode; className?: string; tone?: "light" | "dark" };

/** A short section label in sentence case, used only where it names the section's subject. */
export function Eyebrow({ children, className, tone = "light" }: Props) {
  return (
    <span
      className={cn(
        "inline-block text-sm font-semibold",
        tone === "light" ? "text-brand-600" : "text-gold-400",
        className,
      )}
    >
      {children}
    </span>
  );
}
