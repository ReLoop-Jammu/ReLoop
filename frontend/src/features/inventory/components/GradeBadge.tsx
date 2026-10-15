import { cn } from "@/lib/utils/cn";
import { GRADE_INFO, type Grade } from "../model";

const STYLE: Record<Grade, string> = {
  A: "bg-grade-a-bg text-grade-a",
  B: "bg-grade-b-bg text-grade-b",
  C: "bg-grade-c-bg text-grade-c",
  D: "bg-grade-d-bg text-grade-d",
};

/** The label parts carry instead of a grade: a tested part (grades apply to devices only). */
export function TestedPartBadge({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      data-part="tested"
      className={cn(
        "inline-flex items-center rounded-full bg-brand-50 font-semibold whitespace-nowrap text-brand-700",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      Tested part
    </span>
  );
}

type Props = { grade: Grade; withLabel?: boolean; size?: "sm" | "md"; className?: string };

export function GradeBadge({ grade, withLabel = true, size = "md", className }: Props) {
  return (
    <span
      data-grade={grade}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        STYLE[grade],
        className,
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-full bg-current font-bold",
          size === "sm" ? "size-4 text-xs leading-none" : "size-5 text-xs leading-none",
        )}
        aria-hidden="true"
      >
        <span className="text-white">{grade}</span>
      </span>
      <span>
        <span className="sr-only">Grade {grade}: </span>
        {withLabel ? (
          GRADE_INFO[grade].short
        ) : (
          <span className="sr-only">{GRADE_INFO[grade].short}</span>
        )}
      </span>
    </span>
  );
}
