"use client";

import Form from "next/form";
import { useRef } from "react";
import { CATEGORIES, CONDITIONS, SORTS, type ListingFilters } from "../model";

const fieldClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink transition focus:border-primary focus:ring-3 focus:ring-primary/15 focus:outline-none sm:text-sm";

/**
 * Filters live in the URL (?q=&category=&condition=&sort=) so results are
 * shareable and work without JavaScript. With JS, selects apply instantly.
 */
export function FilterBar({ filters }: { filters: ListingFilters }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  return (
    <Form
      ref={formRef}
      action="/listings"
      scroll={false}
      role="search"
      aria-label="Filter listings"
      className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
    >
      <label className="sm:col-span-2 lg:col-span-1">
        <span className="sr-only">Search listings</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search laptops, RAM, bulk lots…"
          maxLength={100}
          className={fieldClass}
        />
      </label>
      <label>
        <span className="sr-only">Category</span>
        <select
          name="category"
          defaultValue={filters.category ?? ""}
          onChange={submit}
          className={fieldClass}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.short}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Condition</span>
        <select
          name="condition"
          defaultValue={filters.condition ?? ""}
          onChange={submit}
          className={fieldClass}
        >
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => (
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
          defaultValue={filters.sort ?? "featured"}
          onChange={submit}
          className={fieldClass}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="bg-primary hover:bg-primary-hover min-h-11 rounded-xl px-5 text-sm font-bold text-white transition"
      >
        Search
      </button>
    </Form>
  );
}
