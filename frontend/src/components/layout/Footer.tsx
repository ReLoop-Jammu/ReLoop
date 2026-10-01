import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { CATEGORIES } from "@/features/listings/model";

const COMPANY_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/impact", label: "Our impact" },
  { href: "/sell", label: "Sell with ReLoop" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-brand-950 text-white/70">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
        <div>
          <Logo id="footer" inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            A managed marketplace giving used electronics from Jammu a second life with buyers
            across India.
          </p>
        </div>
        <nav aria-label="Shop by category">
          <h2 className="font-sans text-sm font-semibold tracking-normal text-white">Shop</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.value}>
                <Link
                  href={`/listings?category=${c.value}`}
                  className="transition hover:text-white"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className="font-sans text-sm font-semibold tracking-normal text-white">ReLoop</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {COMPANY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-sans text-sm font-semibold tracking-normal text-white">
            Early preview
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Listings shown are sample data. No payments, pickups or recycling services are processed
            yet.
          </p>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-wrap justify-between gap-2 py-6 text-xs text-white/50">
          <span>© {new Date().getFullYear()} ReLoop Jammu</span>
          <nav aria-label="Legal">
            <ul className="flex gap-5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>
    </footer>
  );
}
