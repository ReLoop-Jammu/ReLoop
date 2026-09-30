import { MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils/money";
import { categoryLabel, type Listing } from "../model";
import { ConditionBadge, ListingVisual } from "./visuals";

export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  return (
    <article
      className="group relative flex w-full animate-rise flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition duration-300 focus-within:ring-2 focus-within:ring-brand-500 hover:-translate-y-1 hover:shadow-lift"
      style={{ animationDelay: `${(index % 8) * 50}ms` }}
    >
      <ListingVisual
        icon={listing.icon}
        category={listing.category}
        className="h-32 transition duration-500 group-hover:scale-[1.03] sm:h-44"
      />
      <ConditionBadge
        condition={listing.condition}
        className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[11px] shadow-soft sm:top-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs"
      />
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-xs font-medium text-muted">{categoryLabel(listing.category)}</p>
        <h3 className="mt-1 line-clamp-2 font-sans text-sm leading-snug font-semibold tracking-normal sm:text-[15px]">
          {/* Stretched link: the whole card is clickable with a single tab stop. */}
          <Link
            href={`/listings/${listing.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {listing.title}
          </Link>
        </h3>
        <div className="mt-auto pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-lg font-bold text-ink sm:text-xl">
              {formatPrice(listing.pricePaise)}
            </span>
            {listing.quantity > 1 && (
              <span className="text-xs text-muted">{listing.quantity} available</span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{listing.city}</span>
            </span>
            {listing.seller.kind !== "individual" && (
              <span className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-600">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Verified</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
