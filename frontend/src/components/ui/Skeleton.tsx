import { cn } from "@/lib/utils/cn";

/** A placeholder block while data loads (it pulses only when motion is allowed). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-lg bg-sunken motion-safe:animate-pulse", className)}
    />
  );
}

/** A labelled loading area: screen readers hear "Loading…", sighted users see blocks. */
export function LoadingBlock({
  label = "Loading…",
  lines = 3,
  className,
}: {
  label?: string;
  lines?: number;
  className?: string;
}) {
  return (
    <div role="status" className={cn("grid gap-3", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
