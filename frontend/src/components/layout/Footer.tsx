import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { SITE } from "@/lib/site";

const SHOP_LINKS = [
  { href: "/shop?grade=A", label: "Grade A: works, clean" },
  { href: "/shop?grade=B", label: "Grade B: repaired" },
  { href: "/shop?grade=C", label: "Grade C: tested parts" },
  { href: "/warranty", label: "Warranty & delivery" },
];

const SELL_LINKS = [
  { href: "/sell/shops", label: "Repair shops & retailers" },
  { href: "/sell/institutions", label: "Institutions" },
  { href: "/sell/home", label: "Households" },
  { href: "/sell/consignment", label: "Consignment" },
];

const COMPANY_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/where-scrap-goes", label: "Where scrap goes" },
  { href: "/impact", label: "Our impact" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

function LinkColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-sans text-sm font-semibold tracking-normal text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="transition hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto bg-brand-950 text-white/70">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo id="footer" inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            We collect used electronics in Jammu, grade every item at one hub, resell what still
            works and send the rest to an authorised recycler.
          </p>
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/50">
            Early preview: items shown in the shop are samples until the hub opens in{" "}
            {SITE.hubOpens}.
          </p>
        </div>
        <LinkColumn title="Shop" links={SHOP_LINKS} />
        <LinkColumn title="Sell to us" links={SELL_LINKS} />
        <LinkColumn title="ReLoop" links={COMPANY_LINKS} />
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
