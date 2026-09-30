import Link from "next/link";
import { formatPrice } from "@/lib/utils/money";
import { categoryLabel, conditionLabel, type Listing } from "../model";

export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  return (
    <article
      className="group animate-fade-up rounded-card border-line bg-surface focus-within:ring-primary hover:border-primary/50 hover:shadow-card relative flex w-full flex-col overflow-hidden border transition duration-300 focus-within:ring-2 hover:-translate-y-1.5"
      style={{ animationDelay: `${(index % 8) * 55}ms` }}
    >
      <div
        className="relative grid h-44 place-items-center bg-[radial-gradient(ellipse_at_50%_100%,rgb(30_107_158/0.08),transparent_65%),linear-gradient(145deg,var(--color-sunken),var(--color-surface))] text-7xl transition group-hover:saturate-125"
        aria-hidden="true"
      >
        {listing.emoji}
      </div>
      <span className="bg-accent text-primary-strong absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold">
        {conditionLabel(listing.condition)}
      </span>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base leading-snug font-extrabold">
          {/* The stretched link makes the whole card clickable with one tab stop. */}
          <Link
            href={`/listings/${listing.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {listing.title}
          </Link>
        </h3>
        <p className="text-muted mt-1 text-xs">{categoryLabel(listing.category)}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <span className="text-primary text-lg font-black">{formatPrice(listing.pricePaise)}</span>
          <span className="text-muted text-xs">Qty {listing.quantity}</span>
        </div>
        <p className="text-muted mt-2 truncate text-xs">
          📍 {listing.city} · {listing.seller.name}
        </p>
      </div>
    </article>
  );
}
