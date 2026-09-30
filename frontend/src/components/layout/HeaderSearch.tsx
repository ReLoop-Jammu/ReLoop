import { Search } from "lucide-react";
import Form from "next/form";
import { cn } from "@/lib/utils/cn";

export function HeaderSearch({ className }: { className?: string }) {
  return (
    <Form
      action="/listings"
      role="search"
      aria-label="Search the marketplace"
      className={cn("relative", className)}
    >
      <label>
        <span className="sr-only">Search listings</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          placeholder="Search laptops, parts, bulk lots…"
          maxLength={100}
          className="min-h-11 w-full rounded-full border border-line bg-sunken/70 pr-4 pl-10 text-base text-ink transition placeholder:text-muted hover:border-line-strong focus:border-brand-500 focus:bg-surface focus:ring-3 focus:ring-brand-500/15 focus:outline-none sm:text-sm"
        />
      </label>
    </Form>
  );
}
