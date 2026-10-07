import { ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { ItemVisual } from "@/features/inventory/components/ItemVisual";
import { categoryLabel } from "@/features/inventory/model";
import { formatPrice } from "@/lib/utils/money";
import type { ShopItem } from "../model";

export function ItemCard({ item, index = 0 }: { item: ShopItem; index?: number }) {
  return (
    <article
      className="group relative flex w-full animate-rise flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition duration-300 focus-within:ring-2 focus-within:ring-brand-500 hover:-translate-y-1 hover:shadow-lift"
      style={{ animationDelay: `${(index % 8) * 50}ms` }}
    >
      <ItemVisual
        category={item.category}
        partType={item.partType}
        grade={item.grade}
        photo={item.photo}
        alt={item.title}
        className="h-32 transition duration-500 group-hover:scale-[1.03] sm:h-44"
      />
      <GradeBadge
        grade={item.grade}
        size="sm"
        className="absolute top-2.5 left-2.5 shadow-soft sm:top-3 sm:left-3"
      />
      {item.wasPaise && (
        <span className="absolute top-2.5 right-2.5 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white sm:top-3 sm:right-3">
          Price cut
        </span>
      )}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="font-mono text-[11px] tracking-wide text-muted">
          {item.id}
          {item.sample && (
            <span className="ml-1.5 rounded bg-sunken px-1 py-px font-sans">Sample</span>
          )}
        </p>
        <h3 className="mt-1 line-clamp-2 font-sans text-sm leading-snug font-semibold tracking-normal sm:text-[15px]">
          {/* Stretched link: the whole card is clickable with a single tab stop. */}
          <Link
            href={`/shop/${item.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {item.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-xs text-muted">{categoryLabel(item.category)}</p>
        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-lg font-bold text-ink sm:text-xl">
              {formatPrice(item.pricePaise)}
            </span>
            {item.wasPaise && (
              <s className="text-xs text-muted">
                <span className="sr-only">was </span>
                {formatPrice(item.wasPaise)}
              </s>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[11px] text-ink-soft sm:text-xs">
            {item.warrantyDays && (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-grade-a" aria-hidden="true" />
                {item.warrantyDays}-day warranty
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Truck className="size-3.5 text-muted" aria-hidden="true" />
              Pickup or ₹50 Jammu delivery
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
