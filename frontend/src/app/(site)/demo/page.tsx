import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  GRADE_MIX,
  ITEMS_PER_MONTH,
  SOURCE_MIX,
} from "@/config/simulation";
import { IS_SIMULATION } from "@/lib/environment";

export const metadata: Metadata = {
  title: "About this simulation",
  robots: { index: false, follow: false },
};

const TRY: Record<(typeof DEMO_ACCOUNTS)[number]["key"], string> = {
  admin: "Verify shops, reset passwords, manage the team and settings, and see every hub tool.",
  staff: "Log intake, grade and list items, handle requests and log recycler handovers.",
  shop: "See your submissions and ReLoop's offers, and submit more items.",
  buyer: "Browse the shop, reserve items and follow your requests.",
};

/** Only on the simulation site: what the data is, and a login for each role. */
export default function DemoPage() {
  if (!IS_SIMULATION) notFound();
  const total = ITEMS_PER_MONTH.reduce((a, b) => a + b, 0);
  const sources = Object.values(SOURCE_MIX).reduce((a, b) => a + b, 0);
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">Simulation</p>
        <h1 className="mt-3 text-4xl font-bold">About this demo</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          This site runs the real ReLoop software on a separate database filled with simulated
          operations. Everything you see here (items, shops, sales, handovers, clicks) is generated
          from the business plan&apos;s assumptions. It is not real data. No WhatsApp message or
          email leaves this site, and anything visitors type into its forms can be seen by everyone
          using the demo logins, so don&apos;t enter real personal details.
        </p>

        <h2 className="mt-10 text-2xl font-bold">How the data was made</h2>
        <ul className="mt-4 grid gap-2 leading-relaxed text-ink-soft">
          <li>
            Six simulated months ending today, ramping from {ITEMS_PER_MONTH[0]} to{" "}
            {ITEMS_PER_MONTH.at(-1)} items a month ({total} in all).
          </li>
          <li>
            Sources as in the plan: repair shops{" "}
            {Math.round((SOURCE_MIX.repair_shop / sources) * 100)}%, retailers{" "}
            {Math.round((SOURCE_MIX.retailer / sources) * 100)}%, institutions{" "}
            {Math.round((SOURCE_MIX.institution / sources) * 100)}% and households{" "}
            {Math.round((SOURCE_MIX.household / sources) * 100)}%.
          </li>
          <li>
            Grades A {GRADE_MIX.A * 100}%, B {GRADE_MIX.B * 100}%, C {GRADE_MIX.C * 100}% and D{" "}
            {GRADE_MIX.D * 100}%. Buy prices follow the grade rules (A about 45% and B about 25% of
            the expected resale price, C ₹100–200, D free).
          </li>
          <li>
            Repairs by partner shops, parts stripped from grade C items, and recycler handovers when
            the scrap cage reaches 100 kg or every 14 days.
          </li>
          <li>Partner shops, institutions and people are fictional, with dummy phone numbers.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold">Log in as each role</h2>
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
              {DEMO_ACCOUNTS.map((a) => (
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
