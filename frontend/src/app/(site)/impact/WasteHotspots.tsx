import Image from "next/image";
import ewastePile from "../../../../public/images/ewaste-pile.jpg";

const HOTSPOTS = [
  {
    id: "monitor",
    left: "31%",
    top: "46%",
    title: "Old monitor",
    body: "Glass, plastics and metals can sometimes be reused, repaired or routed for material recovery.",
  },
  {
    id: "phone",
    left: "65%",
    top: "45%",
    title: "Discarded phone",
    body: "A phone can still contain useful components and recoverable metals even after its first owner is finished with it.",
  },
  {
    id: "battery",
    left: "38%",
    top: "72%",
    title: "Laptop battery",
    body: "Batteries need careful handling. They should not be casually dismantled or mixed into ordinary waste.",
  },
  {
    id: "board",
    left: "70%",
    top: "68%",
    title: "Circuit board",
    body: "Boards can contain valuable materials and may be suitable for component recovery or authorised recycling.",
  },
] as const;

/**
 * Photo with CSS-only hotspots: tooltips open on hover and on keyboard/tap
 * focus, so they work without JavaScript and on touch screens.
 */
export function WasteHotspots() {
  return (
    <figure className="relative overflow-hidden rounded-panel bg-brand-950 shadow-float">
      <Image
        src={ewastePile}
        alt="Pile of discarded electronic waste including monitors, phones, batteries and circuit boards"
        priority
        placeholder="blur"
        sizes="(min-width: 1024px) 600px, 100vw"
        className="h-full min-h-80 w-full object-cover"
      />
      {HOTSPOTS.map((spot) => (
        <button
          key={spot.id}
          type="button"
          aria-describedby={`hotspot-${spot.id}`}
          className="group absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gold-500 shadow-[0_0_0_6px_rgb(232_184_58/0.35)] transition hover:scale-110 focus-visible:outline-white"
          style={{ left: spot.left, top: spot.top }}
        >
          <span className="sr-only">{spot.title}</span>
          <span
            id={`hotspot-${spot.id}`}
            role="tooltip"
            className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-3 w-56 -translate-x-1/2 rounded-xl bg-surface p-3 text-left text-xs leading-relaxed text-muted opacity-0 shadow-lift transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
          >
            <strong className="block text-sm text-ink">{spot.title}</strong>
            {spot.body}
          </span>
        </button>
      ))}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-950/90 to-transparent px-5 pt-10 pb-4 text-sm font-medium text-white">
        Tap or hover the glowing points to see what is hidden inside e-waste.
      </figcaption>
    </figure>
  );
}
