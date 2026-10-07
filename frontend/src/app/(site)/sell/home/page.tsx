import { House } from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { HouseholdSell } from "@/features/sell/components/HouseholdSell";
import { SellPageHeader } from "@/features/sell/components/SellPageHeader";

export const metadata: Metadata = {
  title: "Sell from home",
  description:
    "Get an estimate for your old phone, laptop or appliance, then drop it at ReLoop's Jammu hub.",
};

export default function HouseholdPage() {
  return (
    <Container className="py-12 sm:py-16">
      <SellPageHeader icon={House} eyebrow="Households" title="What's your old device worth?">
        <p>
          Answer three questions for an estimate. Working items are paid for; anything dead or
          unsafe is taken for free and handled properly.
        </p>
      </SellPageHeader>
      <div className="mt-10">
        <HouseholdSell />
      </div>
    </Container>
  );
}
