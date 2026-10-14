import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  as?: ElementType;
  padding?: "none" | "sm" | "md" | "lg";
  tone?: "surface" | "sunken" | "ink";
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"div">, "className" | "children">;

const PAD = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };
const TONE = {
  surface: "border border-line bg-surface",
  sunken: "bg-sunken",
  ink: "bg-brand-950 text-white",
};

/** The one bordered surface: content blocks, panels and tiles. */
export function Card({
  as: Tag = "div",
  padding = "md",
  tone = "surface",
  className,
  children,
  ...rest
}: Props) {
  return (
    <Tag className={cn("rounded-card", TONE[tone], PAD[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}
