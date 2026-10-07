import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { RequestForm } from "@/features/sell/components/RequestForm";
import { BenefitList, SellPageHeader } from "@/features/sell/components/SellPageHeader";

export const metadata: Metadata = {
  title: "Institutions",
  description:
    "Colleges, schools, banks and offices in Jammu: book a pickup for old IT equipment, with sorting and a handover record.",
};

export default function InstitutionsPage() {
  return (
    <Container className="py-12 sm:py-16">
      <SellPageHeader
        icon={Building2}
        eyebrow="Colleges, schools, banks & offices"
        title="Clear out old IT equipment, properly"
      >
        <p>
          Desktops, monitors, printers and UPS units from labs, hostels and offices. We collect the
          lot, sort it, buy what can be reused, and make sure the rest reaches an authorised
          recycler.
        </p>
      </SellPageHeader>
      <div className="mt-10">
        <BenefitList
          items={[
            {
              title: "Booked pickup",
              body: "We schedule a date that suits you and bring a vehicle sized to the lot.",
            },
            {
              title: "Sorting done for you",
              body: "Every item is tested and graded at our hub, not on your premises.",
            },
            {
              title: "A handover record",
              body: "A list of what we collected, for your asset register and audits.",
            },
            {
              title: "Working equipment bought",
              body: "We buy the working and repairable equipment from you.",
            },
            {
              title: "Dead e-waste in your name",
              body: "Dead items go directly to an authorised recycler with your institution named on the weight receipt.",
            },
            {
              title: "Data handled",
              body: "Hard drives are wiped, or physically destroyed if a wipe fails.",
            },
          ]}
        />
      </div>
      <section className="mt-14 max-w-3xl" aria-labelledby="book-heading">
        <h2 id="book-heading" className="text-2xl font-bold sm:text-3xl">
          Book a pickup
        </h2>
        <p className="mt-2 text-muted">
          We&apos;ll confirm the date, the vehicle and any charges with you before we come.
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
              { name: "date", label: "Preferred date", type: "date" },
              {
                name: "items",
                label: "What is in the lot? (approx.)",
                type: "textarea",
                required: true,
                placeholder: "e.g. 20 desktops, 15 monitors, 3 printers, 2 UPS",
              },
            ]}
          />
        </div>
      </section>
    </Container>
  );
}
