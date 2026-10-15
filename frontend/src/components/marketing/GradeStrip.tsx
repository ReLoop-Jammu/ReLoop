import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { GRADE_INFO, GRADES } from "@/features/inventory/model";

const BAR: Record<(typeof GRADES)[number], string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
};

/** The four grades and what happens to each. */
export function GradeStrip() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="list">
      {GRADES.map((g) => (
        <li
          key={g}
          className="group relative overflow-hidden rounded-card border border-line bg-surface p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
        >
          <div className={`absolute inset-x-0 top-0 h-1.5 ${BAR[g]}`} aria-hidden="true" />
          <div className="flex items-center justify-between">
            <span className="font-display text-6xl leading-none font-bold text-ink">{g}</span>
            <GradeBadge grade={g} size="sm" />
          </div>
          <p className="mt-3 font-semibold text-ink">{GRADE_INFO[g].outcome}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{GRADE_INFO[g].description}</p>
        </li>
      ))}
    </ul>
  );
}
