import type { Metadata } from "next";
import { StandardPage } from "@/components/marketing/StandardPage";

export const metadata: Metadata = {
  title: "Ownership rule",
  description:
    "ReLoop buys only from sellers who own what they sell, or have it signed over to them.",
};

export default function OwnershipPage() {
  return (
    <StandardPage
      title="Ownership rule"
      lead="We buy only from people who own what they are selling, or who have had it signed over to them."
      sections={[
        {
          title: "The seller confirms it",
          body: (
            <p>
              At every purchase the seller confirms they own the items or have them signed over. The
              hub records the confirmation with the time and the staff member present. For a counter
              weigh-in, the confirmation covers the whole bag.
            </p>
          ),
        },
        {
          title: "Locked or doubtful items",
          body: (
            <p>
              A device locked to someone&apos;s account is never resold whole. If anything about an
              item suggests it is not the seller&apos;s, we don&apos;t buy it.
            </p>
          ),
        },
        {
          title: "A record for every item",
          body: (
            <p>
              Each item&apos;s tag keeps where it came from and when, so it can be traced back if a
              question is ever asked.
            </p>
          ),
        },
      ]}
    />
  );
}
