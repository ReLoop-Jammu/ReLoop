import { Clock, Tag } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { BUSINESS_RULES } from "@/config/business-rules";
import { SellPageHeader } from "@/features/sell/components/SellPageHeader";

const commission = `${Math.round(BUSINESS_RULES.selfListingCommission * 100)}%`;

export const metadata: Metadata = {
  title: "List it yourself",
  description: `Self-listing on ReLoop with an ${commission} commission is coming later.`,
};

export default function ListYourselfPage() {
  return (
    <Container className="py-12 sm:py-16">
      <SellPageHeader
        icon={Tag}
        eyebrow="Self-listing"
        title="List it yourself, set your own price"
      >
        <p>
          Self-listing will let you put an item on the ReLoop shop at your own price, with an{" "}
          {commission} commission when it sells.
        </p>
      </SellPageHeader>
      <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-100 px-4 py-2 text-sm font-medium text-gold-700">
        <Clock className="size-4" aria-hidden="true" />
        Coming later: it needs seller accounts, which are not live yet.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/sell/home">Get an estimate instead</ButtonLink>
        <ButtonLink href="/sell" variant="secondary">
          All ways to sell
        </ButtonLink>
      </div>
    </Container>
  );
}
