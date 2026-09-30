import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
};

export function SectionHeading({
  title,
  description,
  eyebrow,
  actions,
  as: Tag = "h2",
  className,
}: Props) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <Tag className="text-3xl font-black tracking-tight sm:text-4xl">{title}</Tag>
        {description && <p className="text-muted mt-2 leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
