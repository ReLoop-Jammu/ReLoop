import {
  BatteryFull,
  CircuitBoard,
  Cpu,
  HardDrive,
  Keyboard,
  Laptop,
  MemoryStick,
  Monitor,
  Monitor as Desktop,
  Plug,
  Printer,
  Refrigerator,
  Smartphone,
  Tv,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { Category, PartType } from "../model";

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  phone: Smartphone,
  laptop: Laptop,
  desktop: Desktop,
  monitor: Monitor,
  tv: Tv,
  printer: Printer,
  ups: Zap,
  small_appliance: Refrigerator,
  accessory: Keyboard,
  part: Cpu,
};

const PART_ICON: Partial<Record<PartType, LucideIcon>> = {
  screen: Monitor,
  board: CircuitBoard,
  ram: MemoryStick,
  storage: HardDrive,
  battery: BatteryFull,
  charger: Plug,
};

const TINT: Record<"A" | "B" | "C", string> = {
  A: "bg-cat-devices-bg text-cat-devices",
  B: "bg-cat-bulk-bg text-cat-bulk",
  C: "bg-cat-repairable-bg text-cat-repairable",
};

type Props = {
  category: Category;
  partType?: PartType;
  grade: "A" | "B" | "C";
  photo?: string;
  alt: string;
  size?: "card" | "hero";
  className?: string;
};

/** The item's photo, or a grade-tinted illustration until a photo exists. */
export function ItemVisual({
  category,
  partType,
  grade,
  photo,
  alt,
  size = "card",
  className,
}: Props) {
  if (photo) {
    return (
      <div className={cn("relative overflow-hidden bg-sunken", className)}>
        <Image
          src={photo}
          alt={alt}
          fill
          unoptimized={photo.startsWith("data:")}
          sizes={
            size === "card" ? "(min-width: 1024px) 25vw, 50vw" : "(min-width: 1024px) 50vw, 100vw"
          }
          className="object-cover"
        />
      </div>
    );
  }
  const Icon = (partType && PART_ICON[partType]) || CATEGORY_ICON[category];
  return (
    <div
      aria-hidden="true"
      className={cn("relative grid place-items-center overflow-hidden", TINT[grade], className)}
    >
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/40" />
      <div className="absolute -bottom-12 -left-8 size-36 rounded-full bg-white/30" />
      <div
        className={cn(
          "relative grid place-items-center rounded-3xl bg-white/80 shadow-soft ring-1 ring-black/5 backdrop-blur-sm",
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
