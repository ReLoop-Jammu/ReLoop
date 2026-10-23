import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  GRADE_MIX,
  ITEMS_PER_MONTH,
  PARTNER_SHOPS_BY_MONTH,
  SCRAP_KG_BY_MONTH,
  SOURCE_MIX,
} from "@/config/simulation";
import { IS_SIMULATION } from "@/lib/environment";

export const metadata: Metadata = {
  title: "About this simulation",
  robots: { index: false, follow: false },
};

const TRY: Partial<Record<(typeof DEMO_ACCOUNTS)[number]["key"], string>> = {
  shop: "See your submissions and ReLoop's offers, your weigh-ins and receipts, and list parts in our used parts shop.",
  buyer: "Browse the shop and our used parts shop, reserve items and follow your requests.",
};
/** The staff and admin demo logins are shared privately, not listed on a public page. */
const PUBLIC_LOGINS = DEMO_ACCOUNTS.filter((a) => a.key in TRY);

/** Only on the simulation site: what the data is, and a login for each role. */
export default function DemoPage() {
  if (!IS_SIMULATION) notFound();
  const total = ITEMS_PER_MONTH.reduce((a, b) => a + b, 0);
  const sources = Object.values(SOURCE_MIX).reduce((a, b) => a + b, 0);
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-brand-600">Simulation</p>
        <h1 className="mt-3 text-4xl font-bold">About this demo</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          This site runs the real ReLoop software on a separate database filled with simulated
          operations. Everything you see here (items, shops, sales, handovers, clicks) is generated
          from the pilot plan&apos;s operating figures. It is not real data. No WhatsApp message or
          email leaves this site, and anything visitors type into its forms can be seen by everyone
          using the demo logins, so don&apos;t enter real personal details.
        </p>

        <h2 className="mt-10 text-2xl font-bold">How the data was made</h2>
        <ul className="mt-4 grid gap-2 leading-relaxed text-ink-soft">
          <li>
            Six simulated months ending today. Every report and KPI is labelled &ldquo;Simulated
            month N&rdquo;. Shops grow from {PARTNER_SHOPS_BY_MONTH[0]} to{" "}
            {PARTNER_SHOPS_BY_MONTH.at(-1)}, scrap weighed at the counter from{" "}
            {SCRAP_KG_BY_MONTH[0]} to {SCRAP_KG_BY_MONTH.at(-1)} kg a month, and devices received
            from {ITEMS_PER_MONTH[0]} to {ITEMS_PER_MONTH.at(-1)} a month ({total} in all).
          </li>
          <li>
            Devices come from retailers {Math.round((SOURCE_MIX.retailer / sources) * 100)}%,
            institutions {Math.round((SOURCE_MIX.institution / sources) * 100)}% and repair shops{" "}
            {Math.round((SOURCE_MIX.repair_shop / sources) * 100)}%, in the grades A{" "}
            {Math.round(GRADE_MIX.A * 100)}%, B {Math.round(GRADE_MIX.B * 100)}%, C{" "}
            {Math.round(GRADE_MIX.C * 100)}% and D {Math.round(GRADE_MIX.D * 100)}%.
          </li>
          <li>
            Scrap is paid by our published scrap prices. Prices that come from the plan are
            simulated working values, not real ones.
          </li>
          <li>
            Repairs by partner shops, parts stripped from grade C devices, used parts shop listings
            by partner shops, institution lots, and handovers to VRRG Group when a bin reaches 100
            kg or 14 days pass.
          </li>
          <li>Partner shops, institutions and people are fictional, with dummy phone numbers.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold">Log in as a buyer or a shop owner</h2>
        <p className="mt-2 text-muted">
          Every demo account uses the password <code className="font-mono">{DEMO_PASSWORD}</code>.
          Changes you make are reset when the simulation is re-seeded.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 font-medium">Try</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PUBLIC_LOGINS.map((a) => (
                <tr key={a.key}>
                  <td className="py-2 pr-4 font-semibold">{a.name}</td>
                  <td className="py-2 pr-4 font-mono">{a.email}</td>
                  <td className="py-2 text-ink-soft">{TRY[a.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6">
          <Link className="font-semibold text-brand-600 underline" href="/login">
            Log in
          </Link>
        </p>
      </div>
    </Container>
  );
}
