import { IS_SIMULATION } from "@/lib/environment";

/** On the simulation site's forms: what visitors type is visible to every demo user. */
export function SimulationFormNote({ className = "" }: { className?: string }) {
  if (!IS_SIMULATION) return null;
  return (
    <p role="note" className={`rounded-xl bg-sunken p-3 text-sm text-ink-soft ${className}`}>
      Simulation: don&apos;t enter real personal details. Anything you send here can be seen by
      everyone using the demo logins, and is deleted when the demo is reset.
    </p>
  );
}
