import type { Metadata } from "next";
import Link from "next/link";
import { StandardPage } from "@/components/marketing/StandardPage";
import { getSiteSettings } from "@/features/settings/server";

export const metadata: Metadata = {
  title: "About ReLoop",
  description: "ReLoop is a circular-economy venture building Jammu's local loop for e-waste.",
};

export default async function AboutPage() {
  const site = await getSiteSettings();
  return (
    <StandardPage
      eyebrow="About"
      title="About ReLoop"
      lead="ReLoop is a circular-economy venture started by students of IIM Jammu as part of a supply chain management project, building Jammu's local loop for e-waste."
      sections={[
        {
          title: "What we do",
          body: (
            <p>
              We buy repair leftovers and used devices from Jammu&apos;s repair shops, retailers and
              exchange stores, and from colleges, schools, banks and offices. At one hub in Gandhi
              Nagar we test and grade everything, resell what works, sell tested parts to
              technicians, and hand what is dead to VRRG Group by weight.{" "}
              <Link href="/how-it-works" className="font-semibold text-brand-600 underline">
                How it works
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Help us build it",
          body: (
            <>
              <p>
                We are looking for repair shops, retailers, institutions, technicians and volunteers
                who want to be part of Jammu&apos;s loop.
              </p>
              <p className="flex flex-wrap gap-4">
                {site.whatsapp && (
                  <a
                    href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hi ReLoop, I'd like to help build the loop.")}`}
                    className="font-semibold text-brand-600 underline"
                  >
                    Message us on WhatsApp
                  </a>
                )}
                {site.supportEmail && (
                  <a
                    href={`mailto:${site.supportEmail}`}
                    className="font-semibold text-brand-600 underline"
                  >
                    {site.supportEmail}
                  </a>
                )}
                <Link href="/sell/shops" className="font-semibold text-brand-600 underline">
                  Become a partner shop
                </Link>
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
