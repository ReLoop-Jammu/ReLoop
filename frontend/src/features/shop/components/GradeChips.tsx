import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { shopHref, type ShopFilters } from "../model";

const CHIPS = [
  { value: undefined, label: "All grades" },
  { value: "A" as const, label: "A · Works, clean" },
  { value: "B" as const, label: "B · Repaired" },
  { value: "C" as const, label: "C · Tested parts" },
];

/** Grade switcher. Keeps the current search, category and sort. */
export function GradeChips({ filters }: { filters: ShopFilters }) {
  return (
    <nav aria-label="Filter by grade" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {CHIPS.map((chip) => {
          const active = filters.grade === chip.value;
          return (
            <li key={chip.label}>
              <Link
                href={shopHref({ ...filters, grade: chip.value })}
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
