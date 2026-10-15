import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { byMarket, getPartnerDirectory } from "@/features/partners/queries";

export const metadata: Metadata = {
  title: "Partner shops",
  description:
    "Repair shops, retailers and exchange stores in Jammu that sell their repair leftovers to ReLoop, listed with their agreement.",
};

export const revalidate = 300;

export default async function PartnersPage() {
  const entries = (await getPartnerDirectory()) ?? [];
  const groups = byMarket(entries);
  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>Partner shops</Eyebrow>
      <h1 className="mt-5 max-w-3xl text-4xl leading-[1.02] font-bold sm:text-6xl">
        Jammu shops in the ReLoop loop
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
        These repair shops, retailers and exchange stores sell their repair leftovers to ReLoop by
        weight on our weekly routes. A shop appears here only after it has agreed. Kilograms are
        shown in bands, from weighed records.
      </p>
      {groups.length === 0 ? (
        <p
          role="status"
          className="mt-10 rounded-card border border-line bg-surface p-6 text-ink-soft shadow-soft"
        >
          <strong className="text-ink">Partner shops are joining.</strong> They are listed here once
          they agree to be shown. Run a shop?{" "}
          <Link href="/sell/shops" className="font-semibold text-brand-600 underline">
            Become a partner shop
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10 space-y-8">
          {groups.map(([market, list]) => (
            <section key={market} aria-labelledby={`m-${market}`}>
              <h2 id={`m-${market}`} className="text-xl font-bold">
                {market}
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
                {list.map((e) => (
                  <li
                    key={`${market}-${e.name}`}
                    className="rounded-card border border-line bg-surface p-5 shadow-soft"
                  >
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-sm text-muted">{e.type}</p>
                    <p className="mt-2 text-sm">
                      Partner since{" "}
                      {new Date(`${e.partner_since}T12:00:00+05:30`).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                        timeZone: "Asia/Kolkata",
                      })}{" "}
                      · {e.kg_band} weighed
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
