import { cn } from "@/lib/utils/cn";

type LogoMarkProps = {
  /** Unique per page: the SVG mask id must not collide between instances. */
  id: string;
  className?: string;
  title?: string;
  /** Light version for dark backgrounds. */
  inverted?: boolean;
};

/** The ReLoop loop-and-arrow mark, ported from the original site. */
export function LogoMark({ id, className, title, inverted = false }: LogoMarkProps) {
  const maskId = `reloop-mask-${id}`;
  const navy = inverted ? "#FFFFFF" : "#26436C";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
          <rect width="120" height="120" fill="#fff" />
          <circle cx="42" cy="91.18" r="4.6" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path d="M42 91.18 A36 36 0 0 1 78 28.82" fill="none" stroke={navy} strokeWidth="12" />
        <path
          d="M81.67 31.25 A36 36 0 0 1 80.65 89.49"
          fill="none"
          stroke="#E9B26E"
          strokeWidth="12"
        />
        <path
          d="M88.33 99.36 L67.23 98.88 L73.99 78.89 Z"
          fill="#E9B26E"
          stroke="#E9B26E"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="42" cy="91.18" r="11.5" fill={navy} />
      </g>
    </svg>
  );
}

type LogoProps = { id: string; className?: string; inverted?: boolean };

export function Logo({ id, className, inverted = false }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display text-[22px] font-bold tracking-tight",
        inverted ? "text-white" : "text-ink",
        className,
      )}
    >
      <LogoMark id={id} className="size-8" inverted={inverted} />
      <span>
        ReLoop<span className={inverted ? "text-gold-400" : "text-gold-500"}>.</span>
      </span>
    </span>
  );
}
