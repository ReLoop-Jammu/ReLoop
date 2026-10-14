import Link from "next/link";
import { shopHref, type ShopFilters } from "../model";

/** Pages of results: previous, a few numbers around this one, and next. */
export function Pagination({
  filters,
  page,
  pages,
}: {
  filters: ShopFilters;
  page: number;
  pages: number;
}) {
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const link =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold";
  return (
    <nav
      aria-label="Pages of results"
      className="mt-8 flex flex-wrap items-center justify-center gap-1"
    >
      {page > 1 && (
        <Link
          href={shopHref({ ...filters, page: page - 1 })}
          className={`${link} text-brand-600 hover:bg-sunken`}
          rel="prev"
        >
          Previous
        </Link>
      )}
      {numbers.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - numbers[i - 1] > 1 && (
            <span className="px-1 text-muted" aria-hidden="true">
              …
            </span>
          )}
          {n === page ? (
            <span aria-current="page" className={`${link} bg-brand-600 text-white`}>
              {n}
            </span>
          ) : (
            <Link
              href={shopHref({ ...filters, page: n })}
              className={`${link} text-ink hover:bg-sunken`}
            >
              <span className="sr-only">Page </span>
              {n}
            </Link>
          )}
        </span>
      ))}
      {page < pages && (
        <Link
          href={shopHref({ ...filters, page: page + 1 })}
          className={`${link} text-brand-600 hover:bg-sunken`}
          rel="next"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
