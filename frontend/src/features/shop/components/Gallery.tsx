"use client";

import Image from "next/image";
import { useState } from "react";
import { ItemVisual } from "@/features/inventory/components/ItemVisual";
import type { ShopItem } from "../model";
import { cn } from "@/lib/utils/cn";

/**
 * The item's photos: the chosen one large, the others as thumbnails. Photos
 * are served as they are stored (not through the image optimiser, whose free
 * monthly quota the shop's photos would use up).
 */
export function Gallery({ item }: { item: ShopItem }) {
  const photos = item.photos?.length ? item.photos : item.photo ? [item.photo] : [];
  const [index, setIndex] = useState(0);
  return (
    <div className="lg:sticky lg:top-28">
      <ItemVisual
        category={item.category}
        partType={item.partType}
        grade={item.grade}
        photo={photos[index]}
        alt={
          photos.length > 1 ? `${item.title}, photo ${index + 1} of ${photos.length}` : item.title
        }
        size="hero"
        className="aspect-[16/11] rounded-panel border border-line lg:aspect-[4/3.4]"
      />
      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2" aria-label="Photos">
          {photos.map((p, i) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                aria-label={`Show photo ${i + 1}`}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg border-2 bg-sunken",
                  i === index ? "border-brand-600" : "border-transparent hover:border-line-strong",
                )}
              >
                <Image src={p} alt="" fill sizes="64px" unoptimized className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
