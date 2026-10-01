import { Clock, Mail, MapPin, Phone, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactDetail } from "@/components/legal/LegalPage";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with ReLoop Jammu about buying, selling or recycling electronics.",
};

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-soft">
      <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-sans text-sm font-semibold tracking-normal text-muted">{title}</h2>
      <p className="mt-1 text-lg font-semibold text-ink">{children}</p>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-2xl">
        <Eyebrow>Contact</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Talk to ReLoop</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Questions about a listing, selling in bulk, or becoming a verified partner? Reach the
          ReLoop team in Jammu.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Mail} title="Email">
          <ContactDetail value={SITE.supportEmail} href={(v) => `mailto:${v}`} />
        </Card>
        <Card icon={Phone} title="Phone">
          <ContactDetail value={SITE.supportPhone} href={(v) => `tel:${v.replace(/\s/g, "")}`} />
        </Card>
        <Card icon={MapPin} title="Collection hub">
          {SITE.address ?? "Jammu, J&K"}
        </Card>
        <Card icon={Clock} title="Hours">
          <ContactDetail value={SITE.hours} />
        </Card>
      </div>
      <div className="mt-4 flex gap-3 rounded-card border border-line bg-sunken p-5 text-sm leading-relaxed text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Privacy or data concerns go to our grievance officer:{" "}
          <ContactDetail value={SITE.grievanceOfficer?.email ?? null} href={(v) => `mailto:${v}`} />
          . See the privacy policy for details.
        </p>
      </div>
    </Container>
  );
}
