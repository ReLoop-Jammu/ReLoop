import { MapPin, ShieldCheck } from "lucide-react";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { ItemVisual } from "@/features/inventory/components/ItemVisual";
import type { ShopItem } from "@/features/shop/model";
import { formatPrice } from "@/lib/utils/money";

/** Decorative stack of graded items for the hero. Hidden from screen readers. */
export function HeroShowcase({ items }: { items: ShopItem[] }) {
  const [front, left, right] = items;
  return (
    <div className="relative mx-auto hidden h-[540px] w-full max-w-lg lg:block" aria-hidden="true">
      <div className="absolute inset-x-5 top-6 bottom-6 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-950 shadow-float">
        <div className="absolute inset-0 bg-dots opacity-60" />
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-gold-500/80 blur-3xl" />
      </div>
      {left && (
        <MiniCard
          item={left}
          className="top-16 left-0 w-[46%] max-w-52 [--tilt:-4deg]"
          delay="0s"
        />
      )}
      {right && (
        <MiniCard
          item={right}
          className="top-24 right-0 w-[46%] max-w-52 [--tilt:4deg]"
          delay="1.4s"
        />
      )}
      {front && (
        <MiniCard
          item={front}
          className="bottom-0 left-1/2 w-[58%] max-w-64 -translate-x-1/2 [--tilt:0deg]"
          delay="0.7s"
          large
        />
      )}
      <div className="absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink shadow-lift">
        <span className="font-mono text-xs text-muted">RL-JMU</span>
        Tagged · tested · graded
      </div>
    </div>
  );
}

function MiniCard({
  item,
  className,
  delay,
  large = false,
}: {
  item: ShopItem;
  className: string;
  delay: string;
  large?: boolean;
}) {
  return (
    <div className={`absolute ${className}`}>
      <div
        className="animate-drift overflow-hidden rounded-2xl border border-white/60 bg-surface shadow-float"
        style={{ animationDelay: delay }}
      >
        <ItemVisual
          category={item.category}
          partType={item.partType}
          grade={item.grade}
          alt=""
          className={large ? "h-28" : "h-20"}
        />
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <GradeBadge grade={item.grade} size="sm" />
            <span className="font-mono text-[10px] text-muted">{item.id}</span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-ink">{item.title}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-display font-bold text-ink">{formatPrice(item.pricePaise)}</span>
            {large && item.warrantyDays ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-grade-a">
                <ShieldCheck className="size-3.5" /> {item.warrantyDays}-day warranty
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
