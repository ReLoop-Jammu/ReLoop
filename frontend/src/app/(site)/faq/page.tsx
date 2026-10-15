import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BUSINESS_RULES } from "@/config/business-rules";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Questions and answers",
  description:
    "Short answers about buying from ReLoop, selling to ReLoop, grades, warranty, data and where scrap goes.",
};

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Where do you sell?",
    a: (
      <>
        In Jammu only. Collect from the hub for free, or get delivery in Jammu city for{" "}
        {formatPrice(BUSINESS_RULES.jammuDeliveryPaise)}. Nothing is sent outside Jammu.
      </>
    ),
  },
  {
    q: "What do the grades mean?",
    a: (
      <>
        A works and is clean; B had one fault that was repaired; C is sold as tested parts; D is
        handed over by weight.{" "}
        <Link href="/standards/grading" className="font-semibold text-brand-600 underline">
          The grading standard
        </Link>
        .
      </>
    ),
  },
  {
    q: "Is there a warranty?",
    a: (
      <>
        {BUSINESS_RULES.warrantyDays} days on grade A and B devices, and a{" "}
        {BUSINESS_RULES.partReturnDays}-day return on tested parts.{" "}
        <Link href="/warranty" className="font-semibold text-brand-600 underline">
          Warranty and returns
        </Link>
        .
      </>
    ),
  },
  {
    q: "What happens to the data on a phone or laptop?",
    a: (
      <>
        It is wiped, or its storage destroyed, and logged against its tag before it is sold or
        stripped.{" "}
        <Link href="/standards/data-wipe" className="font-semibold text-brand-600 underline">
          The data-wipe standard
        </Link>
        .
      </>
    ),
  },
  {
    q: "I run a repair shop. How do I sell to you?",
    a: (
      <>
        We visit on a fixed weekly day, weigh your leftovers in front of you at the rate card and
        pay by UPI on the spot.{" "}
        <Link href="/sell/shops" className="font-semibold text-brand-600 underline">
          For repair shops and retailers
        </Link>
        .
      </>
    ),
  },
  {
    q: "Do you buy from households?",
    a: "No. We buy from repair shops, retailers, exchange stores and institutions only.",
  },
  {
    q: "Where does the scrap go?",
    a: (
      <>
        To VRRG Group, our dismantling partner in Gangyal, on a weight receipt. Every handover is in
        the{" "}
        <Link href="/ledger" className="font-semibold text-brand-600 underline">
          handover ledger
        </Link>
        .
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <Container className="py-12 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <Eyebrow>Questions and answers</Eyebrow>
        <h1 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-6xl">
          Questions and answers
        </h1>
        <div className="mt-10 divide-y divide-line rounded-card border border-line bg-surface shadow-soft">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer text-lg font-semibold text-ink">{f.q}</summary>
              <p className="mt-2 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </article>
    </Container>
  );
}
