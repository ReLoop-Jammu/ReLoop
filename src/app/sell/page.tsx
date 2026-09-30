import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Sell with ReLoop",
  description: "List used electronics, components and bulk lots with ReLoop Jammu.",
};

const CHECKLIST = [
  "A clear title, e.g. “Dell Latitude 5490 laptop”",
  "Category and honest condition (working, tested, repairable, parts only or end-of-life)",
  "Price in rupees, or ask buyers to request a quote",
  "Quantity and pickup location",
  "Up to 8 photos (JPG, PNG or WebP, 5 MB each)",
  "Faults, testing performed and data-wipe status",
];

export default function SellPage() {
  return (
    <Container className="py-10 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow={<Eyebrow>Sell with ReLoop</Eyebrow>}
        title="Give your electronics their next life"
        description="Online listing opens soon, with seller accounts. Here’s how it will work, and what to have ready."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border-line bg-surface border p-6">
          <h2 className="text-lg font-extrabold">Individuals</h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Create a free account and list your items. ReLoop reviews each listing before it goes
            live — usually within a working day.
          </p>
          <h2 className="mt-6 text-lg font-extrabold">Businesses &amp; collection partners</h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Apply for verification with your organisation details. Once verified, your listings
            publish immediately.
          </p>
        </div>
        <div className="rounded-card border-line bg-surface border p-6">
          <h2 className="text-lg font-extrabold">What to have ready</h2>
          <ul className="text-muted mt-3 space-y-2 text-sm leading-relaxed">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="text-success">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="rounded-card border-accent/60 bg-accent/10 text-muted mt-6 border p-5 text-sm leading-relaxed">
        End-of-life e-waste, batteries and hazardous components need appropriate handling through
        authorised channels. ReLoop does not yet arrange collection or recycling.
      </p>
      <div className="mt-8">
        <ButtonLink href="/how-it-works" variant="secondary">
          How ReLoop works →
        </ButtonLink>
      </div>
    </Container>
  );
}
