import { BadgeCheck, MapPin } from "lucide-react";
import { ConditionBadge, ListingVisual } from "@/features/listings/components/visuals";
import type { Listing } from "@/features/listings/model";
import { formatPrice } from "@/lib/utils/money";

/** Decorative stack of real listings for the hero. Hidden from screen readers. */
export function HeroShowcase({ listings, total }: { listings: Listing[]; total: number }) {
  const [front, left, right] = listings;
  return (
    <div className="relative mx-auto hidden h-[540px] w-full max-w-lg lg:block" aria-hidden="true">
      <div className="absolute inset-x-5 top-6 bottom-6 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-950 shadow-float">
        <div className="absolute inset-0 bg-dots opacity-60" />
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-gold-500/80 blur-3xl" />
      </div>

      {left && (
        <MiniCard
          listing={left}
          className="top-16 left-0 w-[46%] max-w-52 [--tilt:-4deg]"
          delay="0s"
        />
      )}
      {right && (
        <MiniCard
          listing={right}
          className="top-24 right-0 w-[46%] max-w-52 [--tilt:4deg]"
          delay="1.4s"
        />
      )}
      {front && (
        <MiniCard
          listing={front}
          className="bottom-0 left-1/2 w-[58%] max-w-64 -translate-x-1/2 [--tilt:0deg]"
          delay="0.7s"
          large
        />
      )}

      <div className="absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink shadow-lift">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-condition-working opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-condition-working" />
        </span>
        {total} items listed
      </div>
    </div>
  );
}

type MiniCardProps = { listing: Listing; className: string; delay: string; large?: boolean };

function MiniCard({ listing, className, delay, large = false }: MiniCardProps) {
  return (
    <div className={`absolute ${className}`}>
      <div
        className="animate-drift overflow-hidden rounded-2xl border border-white/60 bg-surface shadow-float"
        style={{ animationDelay: delay }}
      >
        <ListingVisual
          icon={listing.icon}
          category={listing.category}
          className={large ? "h-28" : "h-20"}
        />
        <div className="p-3">
          <ConditionBadge condition={listing.condition} className="px-2 py-0.5 text-[10px]" />
          <p className="mt-2 truncate text-sm font-semibold text-ink">{listing.title}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-display font-bold text-ink">
              {formatPrice(listing.pricePaise)}
            </span>
            {large ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted">
                <MapPin className="size-3" /> Jammu
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
