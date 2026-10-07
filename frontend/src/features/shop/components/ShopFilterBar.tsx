"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import { useRef } from "react";
import { CATEGORIES } from "@/features/inventory/model";
import { SHOP_SORTS, type ShopFilters } from "../model";

const selectClass =
  "min-h-11 w-full appearance-none rounded-xl border border-line bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b646e%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 pl-3.5 text-base text-ink transition hover:border-line-strong focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none sm:text-sm";

/**
 * Search, category and sort live in the URL (?q=&category=&sort=&grade=) so
 * results are shareable and work without JavaScript. Selects apply instantly.
 */
export function ShopFilterBar({ filters }: { filters: ShopFilters }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  return (
    <Form
      ref={formRef}
      action="/shop"
      scroll={false}
      role="search"
      aria-label="Search and filter stock"
      className="mb-5 grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-3 shadow-soft lg:grid-cols-[minmax(0,1fr)_200px_200px]"
    >
      {filters.grade && <input type="hidden" name="grade" value={filters.grade} />}
      <label className="relative col-span-2 lg:col-span-1">
        <span className="sr-only">Search stock</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search phones, laptops, RAM, item ID…"
          maxLength={100}
          className="min-h-11 w-full rounded-xl border border-line bg-canvas pr-3.5 pl-10 text-base text-ink transition placeholder:text-muted hover:border-line-strong focus:border-brand-500 focus:bg-surface focus:ring-3 focus:ring-brand-500/15 focus:outline-none sm:text-sm"
        />
      </label>
      <label>
        <span className="sr-only">Category</span>
        <select
          name="category"
          defaultValue={filters.category ?? ""}
          onChange={submit}
          className={selectClass}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Sort by</span>
        <select
          name="sort"
          defaultValue={filters.sort ?? "newest"}
          onChange={submit}
          className={selectClass}
        >
          {SHOP_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="sr-only focus:not-sr-only">
        Apply filters
      </button>
    </Form>
  );
}
