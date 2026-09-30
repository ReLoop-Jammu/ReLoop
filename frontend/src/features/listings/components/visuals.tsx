import {
  BatteryFull,
  Boxes,
  Cable,
  HardDrive,
  Keyboard,
  Laptop,
  MemoryStick,
  Monitor,
  Printer,
  Recycle,
  Smartphone,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { conditionLabel, type Category, type Condition, type ListingIcon } from "../model";

const LISTING_ICONS: Record<ListingIcon, LucideIcon> = {
  laptop: Laptop,
  memory: MemoryStick,
  wrench: Wrench,
  boxes: Boxes,
  drive: HardDrive,
  recycle: Recycle,
  monitor: Monitor,
  cable: Cable,
  keyboard: Keyboard,
  battery: BatteryFull,
  printer: Printer,
  smartphone: Smartphone,
};

export const CATEGORY_STYLE: Record<
  Category,
  { icon: LucideIcon; text: string; bg: string; ring: string }
> = {
  devices: {
    icon: Laptop,
    text: "text-cat-devices",
    bg: "bg-cat-devices-bg",
    ring: "ring-cat-devices/20",
  },
  components: {
    icon: MemoryStick,
    text: "text-cat-components",
    bg: "bg-cat-components-bg",
    ring: "ring-cat-components/20",
  },
  repairable: {
    icon: Wrench,
    text: "text-cat-repairable",
    bg: "bg-cat-repairable-bg",
    ring: "ring-cat-repairable/20",
  },
  bulk_lots: { icon: Boxes, text: "text-cat-bulk", bg: "bg-cat-bulk-bg", ring: "ring-cat-bulk/20" },
  recycling: {
    icon: Recycle,
    text: "text-cat-recycling",
    bg: "bg-cat-recycling-bg",
    ring: "ring-cat-recycling/20",
  },
};

const CONDITION_STYLE: Record<Condition, string> = {
  working: "bg-condition-working-bg text-condition-working",
  tested: "bg-condition-tested-bg text-condition-tested",
  repairable: "bg-condition-repairable-bg text-condition-repairable",
  parts_only: "bg-condition-parts-bg text-condition-parts",
  end_of_life: "bg-condition-eol-bg text-condition-eol",
};

export function ConditionBadge({
  condition,
  className,
}: {
  condition: Condition;
  className?: string;
}) {
  return (
    <span
      data-condition={condition}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        CONDITION_STYLE[condition],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {conditionLabel(condition)}
    </span>
  );
}

type VisualProps = {
  icon: ListingIcon;
  category: Category;
  size?: "card" | "hero";
  className?: string;
};

/** Category-tinted illustration used in place of a product photo. */
export function ListingVisual({ icon, category, size = "card", className }: VisualProps) {
  const Icon = LISTING_ICONS[icon];
  const style = CATEGORY_STYLE[category];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid place-items-center overflow-hidden",
        style.bg,
        style.text,
        className,
      )}
    >
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/40" />
      <div className="absolute -bottom-12 -left-8 size-36 rounded-full bg-white/30" />
      <div
        className={cn(
          "relative grid place-items-center rounded-3xl bg-white/80 shadow-soft ring-1 backdrop-blur-sm",
          style.ring,
          size === "card" ? "size-14 sm:size-20" : "size-32 sm:size-40",
        )}
      >
        <Icon
          strokeWidth={1.5}
          className={size === "card" ? "size-7 sm:size-10" : "size-16 sm:size-20"}
        />
      </div>
    </div>
  );
}
