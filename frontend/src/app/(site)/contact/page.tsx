import Link from "next/link";
import { Clock, Mail, MapPin, Phone, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactDetail } from "@/components/legal/LegalPage";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IS_SIMULATION } from "@/lib/environment";
import { getSiteSettings } from "@/features/settings/server";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with ReLoop Jammu about buying or selling used phones, laptops, computers, monitors and parts.",
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

export default async function ContactPage() {
  const site = await getSiteSettings();
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-2xl">
        <Eyebrow>Contact</Eyebrow>
        <h1 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-6xl">Talk to ReLoop</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Questions about an item, selling to us, or becoming a partner shop? Reach the ReLoop team
          in Jammu.
        </p>
        {IS_SIMULATION && (
          <p role="note" className="mt-4 rounded-xl bg-sunken p-4 text-sm">
            This is the simulation. These are the real ReLoop team&apos;s details: please contact
            them only about the real ReLoop, not about anything you did on this demo.
          </p>
        )}
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Mail} title="Email">
          <ContactDetail value={site.supportEmail} href={(v) => `mailto:${v}`} />
        </Card>
        <Card icon={Phone} title="Phone">
          <ContactDetail value={site.supportPhone} href={(v) => `tel:${v.replace(/\s/g, "")}`} />
        </Card>
        <Card icon={MapPin} title="Collection hub">
          {site.hubAddress ?? `Old-city market area, Jammu (opening ${site.hubOpens})`}
          <Link href="/locations" className="mt-1 block font-semibold text-brand-600 underline">
            See the map
          </Link>
        </Card>
        <Card icon={Clock} title="Hours">
          <ContactDetail value={site.hours} />
        </Card>
      </div>
      <div className="mt-4 flex gap-3 rounded-card border border-line bg-sunken p-5 text-sm leading-relaxed text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Complaints, privacy or data concerns go to our{" "}
          {SITE.grievanceOfficer?.designation.toLowerCase() ?? "grievance officer"}
          {SITE.grievanceOfficer && <>, {SITE.grievanceOfficer.name}</>}:{" "}
          <ContactDetail value={SITE.grievanceOfficer?.email ?? null} href={(v) => `mailto:${v}`} />
          {SITE.grievanceOfficer && (
            <>
              {" "}
              or{" "}
              <ContactDetail
                value={SITE.grievanceOfficer.phone}
                href={(v) => `tel:${v.replace(/\s/g, "")}`}
              />
            </>
          )}
          . See the privacy policy for details.
        </p>
      </div>
    </Container>
  );
}
