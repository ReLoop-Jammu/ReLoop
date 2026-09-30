import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/** Centered page column with the standard 16px mobile / 22px desktop gutter. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-[1180px] px-4 sm:px-[22px]", className)} {...props} />
  );
}
