import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { shopHref, type ShopFilters } from "../model";

const CHIPS: {
  key: string;
  grade?: "A" | "B";
  kind?: "parts";
  label: string;
}[] = [
  { key: "all", label: "All devices" },
  { key: "A", grade: "A", label: "A · Works, clean" },
  { key: "B", grade: "B", label: "B · Repaired" },
  { key: "parts", kind: "parts", label: "Used parts" },
];

/**
 * Devices by grade, and the used parts shop (used parts are tested and working, not graded, and
 * are shown apart from devices). Keeps the current search, category and sort.
 */
export function GradeChips({ filters }: { filters: ShopFilters }) {
  return (
    <nav
      aria-label="Devices by grade, or used parts"
      className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max gap-2">
        {CHIPS.map((chip) => {
          const active =
            chip.kind === "parts"
              ? filters.kind === "parts"
              : filters.kind !== "parts" && filters.grade === chip.grade;
          return (
            <li key={chip.key}>
              <Link
                href={shopHref({
                  ...filters,
                  grade: chip.grade,
                  kind: chip.kind,
                  ...(chip.kind === "parts" && { category: undefined, brand: undefined }),
                })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition",
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                {chip.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
