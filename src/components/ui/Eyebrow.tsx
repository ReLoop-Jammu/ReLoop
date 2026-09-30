import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "border-primary/25 bg-primary/5 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold tracking-wider uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
