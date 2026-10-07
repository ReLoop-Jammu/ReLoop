import { HandCoins } from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { BUSINESS_RULES } from "@/config/business-rules";
import { RequestForm } from "@/features/sell/components/RequestForm";
import { BenefitList, SellPageHeader } from "@/features/sell/components/SellPageHeader";
import { formatPrice } from "@/lib/utils/money";

const threshold = formatPrice(BUSINESS_RULES.consignment.thresholdPaise);
const share = `${Math.round(BUSINESS_RULES.consignment.sellerShare * 100)}%`;

export const metadata: Metadata = {
  title: "Consignment",
  description: `Items worth more than ${threshold}: ReLoop tests, lists and sells them, and you receive ${share} when it sells.`,
};

export default function ConsignmentPage() {
  return (
    <Container className="py-12 sm:py-16">
      <SellPageHeader
        icon={HandCoins}
        eyebrow="Consignment"
        title={`Worth more than ${threshold}? Get ${share} of the sale.`}
      >
        <p>
          For higher-value items you can choose consignment instead of cash: we test, grade,
          photograph and list the item, and you receive {share} of the sale price when it sells.
        </p>
      </SellPageHeader>
      <div className="mt-10">
        <BenefitList
          items={[
            {
              title: "1. We test and grade it",
              body: "At our hub, with the same checks as everything we sell.",
            },
            {
              title: "2. We list and sell it",
              body: "On the ReLoop shop, with hub pickup or delivery in Jammu.",
            },
            {
              title: `3. You receive ${share}`,
              body: "Paid to you once the buyer has completed the purchase.",
            },
          ]}
        />
      </div>
      <section className="mt-14 max-w-3xl" aria-labelledby="consign-heading">
        <h2 id="consign-heading" className="text-2xl font-bold sm:text-3xl">
          Ask about consignment
        </h2>
        <p className="mt-2 text-muted">
          We&apos;ll confirm the price, timeline and terms with you before you hand anything over.
        </p>
        <div className="mt-6">
          <RequestForm
            kind="consignment"
            title="Consignment request"
            submitLabel="Prepare my request"
            fields={[
              { name: "name", label: "Your name", required: true, autoComplete: "name" },
              {
                name: "phone",
                label: "Phone / WhatsApp",
                type: "tel",
                required: true,
                autoComplete: "tel",
              },
              {
                name: "item",
                label: "Item, brand and model",
                required: true,
                full: true,
                placeholder: "e.g. MacBook Air M1, 8 GB / 256 GB",
              },
              {
                name: "value",
                label: "What similar used ones sell for (₹)",
                type: "number",
                placeholder: "e.g. 45000",
              },
              {
                name: "condition",
                label: "Condition",
                type: "select",
                options: ["Works perfectly", "One problem", "Several problems"],
              },
              { name: "notes", label: "Anything else?", type: "textarea" },
            ]}
          />
        </div>
      </section>
    </Container>
  );
}
