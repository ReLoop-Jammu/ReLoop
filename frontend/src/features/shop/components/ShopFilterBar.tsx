"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import { useRef } from "react";
import { controlClasses } from "@/components/ui/controls";
import { CATEGORIES } from "@/features/inventory/model";
import { SHOP_SORTS, type ShopFilters } from "../model";

const selectClass = controlClasses({ select: true });

/**
 * Search, category, brand, price range and sort live in the URL
 * (?q=&category=&brand=&min=&max=&sort=&grade=) so results are shareable and
 * work without JavaScript. Selects apply instantly; prices on Enter or Apply.
 */
export function ShopFilterBar({
  filters,
  brands = [],
}: {
  filters: ShopFilters;
  brands?: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  return (
    <Form
      ref={formRef}
      action="/shop"
      scroll={false}
      id="search"
      role="search"
      aria-label="Search and filter stock"
      className="mb-5 grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-3 shadow-soft lg:grid-cols-[minmax(0,1fr)_180px_160px_180px]"
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
        <span className="sr-only">Brand</span>
        <select
          name="brand"
          defaultValue={filters.brand ?? ""}
          onChange={submit}
          className={selectClass}
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
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
      <fieldset className="col-span-2 flex flex-wrap items-center gap-2 text-sm lg:col-span-4">
        <legend className="sr-only">Price range (₹)</legend>
        <span className="text-muted" aria-hidden="true">
          Price ₹
        </span>
        <label>
          <span className="sr-only">Lowest price (₹)</span>
          <input
            type="number"
            name="min"
            min={0}
            step={50}
            inputMode="numeric"
            placeholder="From"
            defaultValue={filters.min ?? ""}
            className={`${controlClasses({})} w-28`}
          />
        </label>
        <span aria-hidden="true">–</span>
        <label>
          <span className="sr-only">Highest price (₹)</span>
          <input
            type="number"
            name="max"
            min={0}
            step={50}
            inputMode="numeric"
            placeholder="To"
            defaultValue={filters.max ?? ""}
            className={`${controlClasses({})} w-28`}
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-full px-4 font-semibold text-brand-600 underline"
        >
          Apply
        </button>
      </fieldset>
    </Form>
  );
}
