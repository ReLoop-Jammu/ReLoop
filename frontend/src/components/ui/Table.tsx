import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** A dense, readable data table that scrolls sideways on narrow screens. */
export function Table({
  caption,
  children,
  className,
}: {
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      // A scrolling area must be reachable by keyboard; a named region says what it holds.
      {...(typeof caption === "string" && { role: "region", "aria-label": caption, tabIndex: 0 })}
      className={cn("overflow-x-auto rounded-card border border-line bg-surface", className)}
    >
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
export const Th = ({ className, ...p }: ComponentProps<"th">) => (
  <th
    scope="col"
    {...p}
    className={cn(
      "border-b border-line bg-sunken/60 px-3 py-2.5 text-xs font-semibold whitespace-nowrap text-ink-soft",
      className,
    )}
  />
);
export const Td = ({ className, ...p }: ComponentProps<"td">) => (
  <td {...p} className={cn("border-b border-line/70 px-3 py-2.5 align-top text-ink", className)} />
);
