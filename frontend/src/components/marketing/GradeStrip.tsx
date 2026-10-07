import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { GRADE_INFO, GRADES } from "@/features/inventory/model";

/** The four grades and what happens to each. */
export function GradeStrip() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="list">
      {GRADES.map((g) => (
        <li key={g} className="rounded-card border border-line bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="font-display text-4xl font-bold text-ink">{g}</span>
            <GradeBadge grade={g} size="sm" />
          </div>
          <p className="mt-3 font-semibold text-ink">{GRADE_INFO[g].outcome}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{GRADE_INFO[g].description}</p>
        </li>
      ))}
    </ul>
  );
}
