import { Store } from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { RequestForm } from "@/features/sell/components/RequestForm";
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
              title: "Cash on pickup",
              body: "Paid at our price list when we collect. No waiting for items to sell.",
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
            {
              title: "A drop-off point",
              body: "Partner shops can also accept household drop-offs on our behalf.",
            },
          ]}
        />
      </div>
      <section className="mt-14 max-w-3xl" aria-labelledby="signup-heading">
        <h2 id="signup-heading" className="text-2xl font-bold sm:text-3xl">
          Sign up as a partner shop
        </h2>
        <p className="mt-2 text-muted">
          We&apos;ll call to agree a pickup day and share our price list.
        </p>
        <div className="mt-6">
          <RequestForm
            kind="shop_partner"
            title="Partner shop sign-up"
            submitLabel="Prepare my sign-up"
            fields={[
              { name: "shop", label: "Shop name", required: true, autoComplete: "organization" },
              {
                name: "type",
                label: "Type of shop",
                type: "select",
                required: true,
                options: ["Repair shop", "Electronics retailer", "Both"],
              },
              { name: "owner", label: "Your name", required: true, autoComplete: "name" },
              {
                name: "phone",
                label: "Phone / WhatsApp",
                type: "tel",
                required: true,
                autoComplete: "tel",
              },
              {
                name: "market",
                label: "Market",
                type: "select",
                required: true,
                options: ["Raghunath Bazaar", "Residency Road", "Gandhi Nagar", "Other"],
              },
              {
                name: "day",
                label: "Best pickup day",
                type: "select",
                options: ["Tuesday", "Friday", "Either"],
              },
              {
                name: "repairs",
                label: "Interested in paid repair work?",
                type: "select",
                options: ["Yes", "No", "Maybe"],
              },
              {
                name: "stock",
                label: "What do you usually have?",
                type: "textarea",
                placeholder: "e.g. 10–15 dead phones a month, old chargers, two exchange laptops",
              },
            ]}
          />
        </div>
      </section>
    </Container>
  );
}
