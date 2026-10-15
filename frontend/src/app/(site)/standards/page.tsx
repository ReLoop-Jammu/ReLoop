import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = {
  title: "Our standards",
  description:
    "The rules ReLoop works to: grading, data wiping, pricing, the rate card, warranty and returns, and ownership.",
};

const STANDARDS = [
  ["/standards/grading", "Grading", "What grades A to D mean, and what a tested part is."],
  [
    "/standards/data-wipe",
    "Data wipe",
    "How storage is wiped, or destroyed, before anything moves on.",
  ],
  ["/how-we-price", "How we price", "Grades, fair-price ranges and what happens to unsold stock."],
  [
    "/standards/rate-card",
    "Rate card",
    "What we pay per kilo, how we weigh, and what we don't take.",
  ],
  ["/warranty", "Warranty and returns", "30 days on devices, 7 days on tested parts."],
  ["/standards/ownership", "Ownership", "We buy only from people who own what they sell."],
  ["/compliance", "Compliance and partners", "The E-Waste Rules in plain words, and VRRG Group."],
] as const;

export default function StandardsPage() {
  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>Our standards</Eyebrow>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">The rules we work to</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
        Each standard is written down here, and the hub&apos;s software enforces it: an item cannot
        be listed without an inspection, a phone cannot be sold before it is wiped, and every kilo
        of scrap leaves on a weight receipt.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2" role="list">
        {STANDARDS.map(([href, title, body]) => (
          <li key={href}>
            <Link
              href={href}
              className="block h-full rounded-card border border-line bg-surface p-6 shadow-soft hover:border-line-strong"
            >
              <span className="text-lg font-semibold">{title}</span>
              <span className="mt-1 block text-sm text-muted">{body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
