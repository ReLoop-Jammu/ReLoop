import { ArrowRight, Building2, Camera, Check, Clock, Info, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = {
  title: "Sell with ReLoop",
  description: "List used electronics, components and bulk lots with ReLoop Jammu.",
};

const CHECKLIST = [
  "A clear title, e.g. “Dell Latitude 5490 laptop”",
  "Category and honest condition",
  "Price in rupees, or ask buyers to request a quote",
  "Quantity and pickup location",
  "Faults, testing performed and data-wipe status",
];

export default function SellPage() {
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-2xl">
        <Eyebrow>Sell with ReLoop</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Give your electronics their next life
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Seller accounts are coming soon. Here&apos;s how selling will work, and what to have
          ready.
        </p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold-100 px-4 py-2 text-sm font-medium text-gold-700">
          <Clock className="size-4" aria-hidden="true" />
          Online listing opens in an upcoming release
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {[
          {
            icon: UserRound,
            title: "Individuals",
            body: "Create a free account and list your items. ReLoop reviews each listing before it goes live — usually within a working day.",
          },
          {
            icon: Building2,
            title: "Businesses & collection partners",
            body: "Apply for verification with your organisation details. Once verified, your listings publish immediately.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">{title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8">
          <h2 className="text-xl font-semibold">What to have ready</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-condition-working-bg text-condition-working">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card bg-brand-950 p-6 text-white sm:p-8">
          <Camera className="size-6 text-gold-400" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-white">Good photos sell faster</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Up to 8 photos per listing: JPG, PNG or WebP, 5 MB each. Show the front, back, ports and
            any damage.
          </p>
        </div>
      </div>

      <p className="mt-4 flex gap-3 rounded-card border border-line bg-sunken p-5 text-sm leading-relaxed text-ink-soft">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        End-of-life e-waste, batteries and hazardous components need handling through authorised
        channels. ReLoop does not yet arrange collection or recycling.
      </p>

      <ButtonLink href="/how-it-works" variant="secondary" className="mt-10">
        How ReLoop works
        <ArrowRight className="size-4" aria-hidden="true" />
      </ButtonLink>
    </Container>
  );
}
