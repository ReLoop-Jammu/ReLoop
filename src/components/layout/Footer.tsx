import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { CATEGORIES } from "@/features/listings/model";

export function Footer() {
  return (
    <footer className="bg-night mt-auto text-white/75">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo id="footer" inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            A managed marketplace connecting Jammu&apos;s used electronics supply with buyers and
            businesses across India. Reuse, repair, recover.
          </p>
        </div>
        <nav aria-label="Marketplace categories">
          <strong className="text-white">Marketplace</strong>
          <ul className="mt-3 space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.value}>
                <Link href={`/listings?category=${c.value}`} className="hover:text-accent">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="About ReLoop">
          <strong className="text-white">ReLoop</strong>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/how-it-works" className="hover:text-accent">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/impact" className="hover:text-accent">
                Our impact
              </Link>
            </li>
            <li>
              <Link href="/sell" className="hover:text-accent">
                Sell with ReLoop
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <strong className="text-white">Early preview</strong>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Listings shown are sample data. No real payments, pickups or recycling services are
            processed yet.
          </p>
        </div>
      </Container>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/60">
        © {new Date().getFullYear()} ReLoop Jammu
      </div>
    </footer>
  );
}
