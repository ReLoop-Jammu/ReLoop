import { Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ShopSubmissionForm } from "@/features/sell/components/ShopSubmissionForm";
import { BenefitList, SellPageHeader } from "@/features/sell/components/SellPageHeader";

export const metadata: Metadata = {
  title: "Partner shops",
  description:
    "Repair shops and electronics retailers in Jammu: sell us unclaimed, dead and old stock for cash on pickup.",
};

export default function ShopsPage() {
  return (
    <Container className="py-12 sm:py-16">
      <SellPageHeader
        icon={Store}
        eyebrow="Repair shops & retailers"
        title="Turn clutter into cash, every week"
      >
        <p>
          Unclaimed customer devices, dead units kept for parts, old spare stock, exchange
          trade-ins, returns and display units: we buy mixed lots and collect them from your
          counter.
        </p>
      </SellPageHeader>
      <div className="mt-10">
        <BenefitList
          items={[
            {
              title: "Paid when we collect",
              body: "In cash or by UPI, at the offer you accepted, with a numbered receipt. No waiting for items to sell.",
            },
            {
              title: "A fixed route",
              body: "We come by e-rickshaw every Tuesday and Friday through Raghunath Bazaar, Residency Road and Gandhi Nagar.",
            },
            {
              title: "One buyer for mixed lots",
              body: "Working, broken and dead together. We sort it at our hub.",
            },
            {
              title: "Paid repair work",
              body: "Partner shops can repair our grade-B items for a fixed fee per job.",
            },
            {
              title: "Dead stock handled properly",
              body: "What can't be reused goes to an authorised recycler, not the street.",
            },
          ]}
        />
        <p className="mt-4 text-sm">
          <Link href="/locations" className="font-semibold text-brand-600 underline">
            See the pickup route and stops on the map
          </Link>
        </p>
      </div>
      <section className="mt-14 max-w-3xl" aria-labelledby="signup-heading">
        <h2 id="signup-heading" className="text-2xl font-bold sm:text-3xl">
          Sign up as a partner shop
        </h2>
        <p className="mt-2 text-muted">
          Tell us about your shop and add multiple items in one submission. Everything goes
          privately to our team for review.{" "}
          <Link href="/help" className="font-semibold text-brand-600 underline">
            Step-by-step help, in English and Hindi
          </Link>
          .
        </p>
        <div className="mt-6">
          <ShopSubmissionForm />
        </div>
      </section>
    </Container>
  );
}
