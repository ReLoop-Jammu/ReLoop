import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CATEGORIES, type Category } from "../model";
import { CATEGORY_STYLE } from "./visuals";

export function CategoryTiles({ counts }: { counts: Record<Category, number> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5" role="list">
      {CATEGORIES.map((c, i) => {
        const style = CATEGORY_STYLE[c.value];
        const Icon = style.icon;
        return (
          <li
            key={c.value}
            className={cn(i === CATEGORIES.length - 1 && "col-span-2 md:col-span-1")}
          >
            <Link
              href={`/listings?category=${c.value}`}
              className="group flex h-full flex-col rounded-card border border-line bg-surface p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-5"
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-2xl",
                    style.bg,
                    style.text,
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="size-4 text-muted opacity-0 transition group-hover:opacity-100"
                  aria-hidden="true"
                />
              </div>
              <strong className="mt-4 font-display text-base font-semibold text-ink">
                {c.label}
              </strong>
              <small className="mt-0.5 text-xs text-muted">{c.blurb}</small>
              <small className="mt-3 text-xs font-medium text-ink-soft">
                {counts[c.value]} {counts[c.value] === 1 ? "listing" : "listings"}
              </small>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
