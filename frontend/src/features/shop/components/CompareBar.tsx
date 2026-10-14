"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { clearCompare, compareHref, useShopList } from "../browser-lists";

/** "Compare (2)" at the bottom of the shop once items are picked to compare. */
export function CompareBar() {
  const items = useShopList("compare");
  if (!items.length) return null;
  return (
    <div className="sticky bottom-4 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-3 shadow-lift">
      <p className="text-sm">
        <strong>{items.length}</strong> to compare:{" "}
        <span className="text-muted">{items.map((i) => i.title).join(" · ")}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clearCompare}
          className={buttonClasses({ size: "sm", variant: "ghost" })}
        >
          Clear
        </button>
        <Link href={compareHref(items)} className={buttonClasses({ size: "sm" })}>
          Compare {items.length > 1 ? `these ${items.length}` : ""}
        </Link>
      </div>
    </div>
  );
}
