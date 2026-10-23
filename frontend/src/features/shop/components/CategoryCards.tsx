import { CircuitBoard, Laptop, Monitor, PcCase, Smartphone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { DEVICES, listOf, PARTS } from "@/config/items";

const ICON: Record<(typeof DEVICES)[number]["key"], LucideIcon> = {
  phone: Smartphone,
  laptop: Laptop,
  desktop: PcCase,
  monitor: Monitor,
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One card per thing we sell, each opening the shop already filtered. Icons are Lucide (ISC licence). */
export function CategoryCards() {
  const cards = [
    ...DEVICES.map((d) => ({
      href: `/shop?category=${d.key}`,
      icon: ICON[d.key],
      en: d.en,
      hi: d.hi,
      noteEn: "Tested and graded",
      noteHi: "जाँचे हुए, ग्रेड के साथ",
    })),
    {
      href: "/shop?kind=parts",
      icon: CircuitBoard,
      en: "Parts",
      hi: "पार्ट्स",
      noteEn: capitalise(listOf(PARTS, "en")),
      noteHi: listOf(PARTS, "hi"),
    },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <li key={c.href} className={c.icon === CircuitBoard ? "col-span-2 sm:col-span-1" : ""}>
            <Link
              href={c.href}
              className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 ring-inset">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="mt-4 text-base font-semibold text-ink">
                <T en={c.en} hi={c.hi} />
              </span>
              <span className="mt-1 text-sm leading-snug text-muted">
                <T en={c.noteEn} hi={c.noteHi} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
