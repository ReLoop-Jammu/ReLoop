import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BUSINESS_RULES } from "@/config/business-rules";
import { getSiteSettings } from "@/features/settings/server";

export const metadata: Metadata = {
  title: "How we price",
  description:
    "How ReLoop sets the price of a used device: the grade, an estimated fair-price range from published listings, and an automatic cut for anything unsold after 45 days.",
  alternates: { canonical: "/how-we-price" },
};

export default async function HowWePricePage() {
  const site = await getSiteSettings();
  const bFactor = Math.round(site.gradeBFactor * 100);
  return (
    <Container className="py-12 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <Eyebrow>How we price</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          A fair price, and why it is that price
        </h1>
        <div className="mt-8 grid gap-6 leading-relaxed text-ink-soft">
          <section>
            <h2 className="text-xl font-semibold text-ink">1. The grade</h2>
            <p className="mt-2">
              Every device is inspected and graded at the Jammu hub. Grade A works fully; grade B
              had one fault, now repaired; grade C items are sold as tested parts. Each item page
              shows its{" "}
              <Link href="/shop" className="font-semibold text-brand-600 underline">
                ReLoop Checked
              </Link>{" "}
              report.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-ink">2. An estimated fair-price range</h2>
            <p className="mt-2">
              For a model or a kind of item we note what working units sell for used (a low, a
              typical and a high price), where we found them, and the date we checked. A grade B
              range is {bFactor}% of the grade A range. An item page shows the range, where our
              price sits in it, and the source and date, only while the check is less than{" "}
              {site.referenceFreshDays} days old. Without a recent check, we show no range rather
              than an old one.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-ink">3. The saving against new</h2>
            <p className="mt-2">
              Where we found the price of the same item new, the page says how much less ours is,
              with where and when we found it.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-ink">4. Unsold stock gets cheaper</h2>
            <p className="mt-2">
              Anything unsold {BUSINESS_RULES.priceCut.afterDays} days after listing is cut by{" "}
              {BUSINESS_RULES.priceCut.share * 100}% automatically, once. Each item page shows its
              own price history.
            </p>
          </section>
        </div>
      </article>
    </Container>
  );
}
