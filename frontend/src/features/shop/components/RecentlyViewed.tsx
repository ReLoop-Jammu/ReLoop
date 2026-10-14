"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatPrice } from "@/lib/utils/money";
import { rememberViewed, useShopList, type SavedItem } from "../browser-lists";

/** The last items this browser looked at (kept on this device only). */
export function RecentlyViewed() {
  const items = useShopList("viewed");
  if (!items.length) return null;
  return (
    <section aria-labelledby="recent-heading" className="mb-6">
      <h2 id="recent-heading" className="text-sm font-semibold text-muted">
        Recently viewed
      </h2>
      <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <Link
              href={`/shop/${i.id}`}
              className="block w-44 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:border-brand-600/40"
            >
              <span className="block truncate font-medium text-ink">{i.title}</span>
              <span className="text-muted">
                {formatPrice(i.pricePaise)} · grade {i.grade}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Records this item page as recently viewed. Renders nothing. */
export function TrackView({ item }: { item: SavedItem }) {
  useEffect(() => {
    rememberViewed(item);
  }, [item]);
  return null;
}
