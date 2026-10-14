import { Container } from "@/components/ui/Container";
import { SITE } from "@/lib/site";
import { formatKg, showImpactNumbers, type ImpactTotals } from "./totals";

/** Home-page impact strip: real totals, or the pilot date until there are any. */
export function ImpactCounter({ totals }: { totals: ImpactTotals | null }) {
  return (
    <section aria-labelledby="impact-heading" className="py-10 sm:py-12">
      <Container>
        <div className="rounded-panel bg-brand-950 px-6 py-8 text-white sm:px-10">
          <h2 id="impact-heading" className="text-sm font-semibold text-gold-400">
            Our impact so far
          </h2>
          {showImpactNumbers(totals) ? (
            <dl className="mt-5 grid gap-6 sm:grid-cols-3">
              {[
                [
                  totals.itemsReused.toLocaleString("en-IN"),
                  "items reused",
                  "Graded A, B or C: resold, repaired or used for parts",
                ],
                [
                  `${formatKg(totals.kgRecycled)} kg`,
                  "handed to the recycler",
                  "Dead items and batteries, weighed, with a receipt",
                ],
                [
                  totals.activePartnerShops.toLocaleString("en-IN"),
                  "active partner shops",
                  "Repair shops and retailers on our pickup route",
                ],
              ].map(([value, label, note]) => (
                <div key={label} className="flex flex-col">
                  <dt className="order-2 mt-1 font-semibold">{label}</dt>
                  <dd className="order-1 text-4xl font-bold tabular-nums">{value}</dd>
                  <dd className="order-3 mt-1 text-sm text-white/65">{note}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-2xl font-bold sm:text-3xl">Pilot starts {SITE.hubOpens}</p>
          )}
        </div>
      </Container>
    </section>
  );
}
