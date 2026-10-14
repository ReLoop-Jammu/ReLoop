"use client";

import { Check, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import {
  COMPARE_MAX,
  compareHref,
  toggleCompare,
  useShopList,
  type SavedItem,
} from "../browser-lists";

/** Adds the item to the compare list (kept in this browser), up to three. */
export function CompareButton({ item }: { item: SavedItem }) {
  const list = useShopList("compare");
  const [full, setFull] = useState(false);
  const picked = list.some((i) => i.id === item.id);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        aria-pressed={picked}
        onClick={() => setFull(!toggleCompare(item))}
        className={buttonClasses({ size: "sm", variant: picked ? "secondary" : "ghost" })}
      >
        {picked ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Scale className="size-4" aria-hidden="true" />
        )}
        {picked ? "Added to compare" : "Compare"}
      </button>
      {picked && list.length > 1 && (
        <Link href={compareHref(list)} className="font-semibold text-brand-600 underline">
          Compare {list.length} items
        </Link>
      )}
      {full && !picked && (
        <span role="status" className="text-muted">
          You can compare {COMPARE_MAX} at a time. Remove one first.
        </span>
      )}
    </div>
  );
}
