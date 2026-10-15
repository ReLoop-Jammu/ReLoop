import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buyerAreaEdges, flowsAreThin, marketEdges, vrrgEdges } from "@/features/impact/flows";
import { getNetworkFlows } from "@/features/impact/queries";
import { formatKg } from "@/features/impact/totals";
import { NetworkMap } from "@/features/network/NetworkMap";

export const metadata: Metadata = {
  title: "The network",
  description:
    "Where Jammu's used electronics and scrap come from, which areas buy tested stock, and how much goes to VRRG Group, shown as totals only.",
};

// The flows come from a public view and are cached for five minutes.
export const revalidate = 300;

const BIN_LABEL: Record<string, string> = {
  screens: "Screens",
  boards: "Boards",
  other: "Everything else",
  d_devices: "D devices",
  batteries: "Batteries",
};

export default async function NetworkPage() {
  const flows = (await getNetworkFlows()) ?? [];
  const thin = flowsAreThin(flows);
  const markets = marketEdges(flows);
  const areas = buyerAreaEdges(flows);
  const vrrg = vrrgEdges(flows);
  const vrrgKg = Math.round(vrrg.reduce((s, v) => s + v.kg, 0) * 10) / 10;
  const maxArea = Math.max(...areas.map((a) => a.items), 1);
  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>The network</Eyebrow>
      <h1 className="mt-5 max-w-3xl text-4xl leading-[1.02] font-bold sm:text-6xl">
        Where it comes from, where it goes
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
        Totals only: no shop, person or address is named. A market with fewer than three active
        partner shops is grouped under &ldquo;Other Jammu markets&rdquo;, and a buyer area appears
        only once at least three items have gone there. Kilograms are counted from weigh-ins and
        weight receipts.
      </p>

      {thin ? (
        <p
          role="status"
          className="mt-10 rounded-card border border-line bg-surface p-6 text-ink-soft shadow-soft"
        >
          <strong className="text-ink">The pilot is starting.</strong> The map fills in as partner
          shops start their weekly pickups. Until then, see{" "}
          <Link href="/locations" className="font-semibold text-brand-600 underline">
            where the hub and the routes are
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-10">
            <NetworkMap
              markets={markets.map((m) => ({
                market: m.market,
                value: m.kg + m.items,
                label: `${formatKg(m.kg)} kg of scrap, ${m.items} items`,
              }))}
              vrrgKg={vrrgKg}
            />
            <p className="mt-2 text-xs text-muted">
              Line thickness shows volume. Positions are approximate.
            </p>
          </div>

          <section className="mt-14" aria-labelledby="markets-heading">
            <SectionHeading
              id="markets-heading"
              eyebrow={<Eyebrow>Into the hub</Eyebrow>}
              title="From Jammu's markets"
            />
            <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Scrap and items received at the hub by market</caption>
                <thead className="border-b border-line text-xs text-muted">
                  <tr>
                    <th scope="col" className="p-3">
                      Market
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Scrap (kg)
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Devices and parts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m) => (
                    <tr key={m.market} className="border-b border-line last:border-0">
                      <th scope="row" className="p-3 font-medium">
                        {m.market}
                      </th>
                      <td className="p-3 text-right tabular-nums">{formatKg(m.kg)}</td>
                      <td className="p-3 text-right tabular-nums">{m.items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <section aria-labelledby="areas-heading">
              <SectionHeading
                id="areas-heading"
                eyebrow={<Eyebrow>Out of the hub</Eyebrow>}
                title="Where tested stock goes"
                description="Items sold, by the buyer's area in Jammu."
              />
              {areas.length === 0 ? (
                <p className="text-sm text-muted">
                  No area has had three items yet, so none is shown.
                </p>
              ) : (
                <ul className="space-y-2">
                  {areas.map((a) => (
                    <li
                      key={a.area}
                      className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm"
                    >
                      <span>{a.area}</span>
                      <span className="h-3 rounded-full bg-sunken" aria-hidden="true">
                        <span
                          className="block h-3 rounded-full bg-brand-600"
                          style={{ width: `${(a.items / maxArea) * 100}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums">{a.items}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="vrrg-heading">
              <SectionHeading
                id="vrrg-heading"
                eyebrow={<Eyebrow>Handed over</Eyebrow>}
                title="To VRRG Group"
                description="Dead scrap and batteries, by weight receipt."
              />
              {vrrg.length === 0 ? (
                <p className="text-sm text-muted">No handover has been recorded yet.</p>
              ) : (
                <ul className="divide-y divide-line rounded-card border border-line bg-surface text-sm shadow-soft">
                  {vrrg.map((v) => (
                    <li key={v.category} className="flex justify-between p-3">
                      <span>{BIN_LABEL[v.category] ?? v.category}</span>
                      <span className="tabular-nums">{formatKg(v.kg)} kg</span>
                    </li>
                  ))}
                  <li className="flex justify-between p-3 font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatKg(vrrgKg)} kg</span>
                  </li>
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </Container>
  );
}
