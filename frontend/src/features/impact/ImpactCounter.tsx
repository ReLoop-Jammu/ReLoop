import { T } from "@/components/i18n/T";
import { Container } from "@/components/ui/Container";
import { formatKg, showImpactNumbers, type ImpactTotals } from "./totals";

/** Home-page impact strip: real totals, or the pilot date until there are any. */
export function ImpactCounter({ totals }: { totals: ImpactTotals | null }) {
  return (
    <section aria-labelledby="impact-heading" className="py-10 sm:py-12">
      <Container>
        <div className="relative overflow-hidden rounded-panel bg-mesh px-6 py-10 text-white shadow-lift sm:px-12 sm:py-12">
          <h2 id="impact-heading" className="text-sm font-semibold text-gold-400">
            <T en="Our impact so far" hi="अब तक का असर" />
          </h2>
          {showImpactNumbers(totals) ? (
            <dl className="mt-5 grid gap-6 sm:grid-cols-3">
              {[
                [
                  totals.itemsReused.toLocaleString("en-IN"),
                  "devices and parts resold",
                  "Grade A and B devices, and working used parts, sold in Jammu",
                ],
                [
                  `${formatKg(totals.kgRecycled)} kg`,
                  "handed to VRRG Group",
                  "Scrap and batteries, by weight, on a weight receipt",
                ],
                [
                  totals.activePartnerShops.toLocaleString("en-IN"),
                  "partner shops",
                  "Repair shops, retailers and exchange stores on our weekly route",
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
            <>
              <p className="mt-3 text-2xl font-bold sm:text-3xl">
                <T en="The Jammu pilot is running" hi="जम्मू पायलट चल रहा है" />
              </p>
              <p className="mt-2 text-white/75">
                <T
                  en="The totals appear here as the hub weighs and tags its first stock."
                  hi="हब में पहला सामान तौलने और नंबर लगाने के बाद कुल आँकड़े यहाँ दिखेंगे।"
                />
              </p>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
