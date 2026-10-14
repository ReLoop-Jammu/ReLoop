import Link from "next/link";
import { IS_SIMULATION } from "@/lib/environment";

/** On every page of the simulation site, so nobody mistakes it for real data. */
export function SimulationBanner() {
  if (!IS_SIMULATION) return null;
  return (
    <div
      role="note"
      className="bg-gold-400 px-4 py-2 text-center text-sm font-semibold text-brand-950"
    >
      Simulation based on business plan assumptions, not real data.{" "}
      <Link href="/demo" className="underline underline-offset-2">
        About the demo and its logins
      </Link>
    </div>
  );
}
