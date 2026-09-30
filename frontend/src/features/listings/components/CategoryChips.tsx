import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CATEGORIES, type ListingFilters } from "../model";

/** Quick category switcher. Keeps the current search and condition. */
export function CategoryChips({ filters }: { filters: ListingFilters }) {
  const hrefFor = (category?: string) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (category) params.set("category", category);
    if (filters.condition) params.set("condition", filters.condition);
    if (filters.sort) params.set("sort", filters.sort);
    const qs = params.toString();
    return qs ? `/listings?${qs}` : "/listings";
  };
  const chips = [
    { value: undefined, label: "All" },
    ...CATEGORIES.map((c) => ({ value: c.value, label: c.short })),
  ];

  return (
    <nav aria-label="Categories" className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {chips.map((chip) => {
          const active = filters.category === chip.value;
          return (
            <li key={chip.label}>
              <Link
                href={hrefFor(chip.value)}
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
