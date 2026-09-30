import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "light" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-bold transition duration-200 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-glow",
  secondary:
    "border border-primary/40 bg-surface text-primary hover:border-primary hover:bg-primary/5",
  light: "border border-line bg-sunken text-primary hover:border-primary/40",
  ghost: "text-primary hover:bg-primary/10",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

type StyleProps = { variant?: Variant; size?: Size; className?: string };

export function buttonClasses({ variant = "primary", size = "md", className }: StyleProps = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
