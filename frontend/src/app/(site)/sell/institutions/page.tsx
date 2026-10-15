import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { RequestForm } from "@/features/sell/components/RequestForm";
import { BenefitList, SellPageHeader } from "@/features/sell/components/SellPageHeader";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Institutions",
  description:
    "Colleges, schools, banks and offices in Jammu: book a lot pickup for old desktops, laptops and monitors, with sorting on site and a handover record.",
};

export default async function InstitutionsPage() {
  const site = await getSiteSettings();
  const fee = formatPrice(site.lotFeePaise);
  return (
    <Container className="py-12 sm:py-16">
      <SellPageHeader
        icon={Building2}
        eyebrow="Colleges, schools, banks & offices"
        title="Clear out old IT equipment, properly"
      >
        <p>
          Desktops, laptops and monitors from labs and offices. We sort the lot on your premises on
          pickup day, buy the working and repairable equipment, and arrange for the dead e-waste to
          go straight to VRRG Group. The fee is {fee} a lot.
        </p>
      </SellPageHeader>
      <div className="mt-10">
        <BenefitList
          items={[
            {
              title: `${fee} a lot`,
              body: "Covers the pickup, sorting on site and a handover record. The fee and the payment for equipment are separate lines on separate receipts, never netted.",
            },
            {
              title: "Booked pickup",
              body: "We schedule a date that suits you. Booking dates open from January 2027.",
            },
            {
              title: "Working equipment bought",
              body: "We buy the working and repairable equipment, tag each device and pay on its own receipt. You confirm the devices are yours to sell.",
            },
            {
              title: "A handover record",
              body: "What ReLoop bought (by tag) and what went to VRRG Group (kg by category, with their receipt number in your institution's name).",
            },
            {
              title: "Dead e-waste straight to VRRG Group",
              body: "ReLoop arranges it but does not carry, store or pay for it. Printers, UPS units, TVs and small appliances are not bought: we will point you to VRRG Group directly.",
            },
            {
              title: "Data handled",
              body: "Storage is wiped, or the chip destroyed, before anything is stripped or sold, and logged against the tag.",
            },
          ]}
        />
      </div>
      <section className="mt-14 max-w-3xl" aria-labelledby="book-heading">
        <h2 id="book-heading" className="text-2xl font-bold sm:text-3xl">
          Book a pickup
        </h2>
        <p className="mt-2 text-muted">
          We&apos;ll confirm the date and the vehicle with you before we come. The lot fee is shown
          on your booking confirmation.
        </p>
        <div className="mt-6">
          <RequestForm
            kind="institution_pickup"
            title="Institution pickup booking"
            submitLabel="Prepare my booking"
            fields={[
              {
                name: "institution",
                label: "Institution",
                required: true,
                autoComplete: "organization",
              },
              {
                name: "type",
                label: "Type",
                type: "select",
                required: true,
                options: ["College / university", "School", "Bank branch", "Office", "Other"],
              },
              { name: "contact", label: "Contact person", required: true, autoComplete: "name" },
              { name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel" },
              { name: "email", label: "Email", type: "email", autoComplete: "email" },
              {
                name: "date",
                label: "Preferred date (from January 2027)",
                min: "2027-01-01",
                type: "date",
              },
              {
                name: "items",
                label: "What is in the lot? (approx.)",
                type: "textarea",
                required: true,
                placeholder: "e.g. 20 desktops, 15 monitors, 5 laptops",
              },
            ]}
          />
        </div>
      </section>
    </Container>
  );
}
