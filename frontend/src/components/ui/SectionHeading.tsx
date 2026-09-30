import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  as?: "h1" | "h2";
  id?: string;
  className?: string;
};

export function SectionHeading({
  title,
  description,
  eyebrow,
  actions,
  as: Tag = "h2",
  id,
  className,
}: Props) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <Tag
          id={id}
          className={cn(
            "font-bold",
            Tag === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
          )}
        >
          {title}
        </Tag>
        {description && (
          <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
