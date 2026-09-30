import { Plus } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HeaderSearch } from "./HeaderSearch";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <>
      <div className="bg-brand-950 py-2 text-center text-xs text-white/80">
        <Container>
          <span className="font-semibold text-gold-400">Early preview</span>
          <span className="mx-2 text-white/30" aria-hidden="true">
            •
          </span>
          Collecting in Jammu, J&amp;K
          <span className="hidden sm:inline"> · Shipping to buyers across India</span>
        </Container>
      </div>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
        <Container className="relative flex h-16 items-center gap-6 lg:h-[72px]">
          <Link href="/" aria-label="ReLoop home" className="shrink-0">
            <Logo id="header" />
          </Link>
          <NavLinks className="hidden lg:flex" />
          <HeaderSearch className="ml-auto hidden w-full max-w-xs md:block" />
          <ButtonLink href="/sell" size="sm" className="hidden md:inline-flex">
            <Plus className="size-4" aria-hidden="true" />
            Sell
          </ButtonLink>
          <div className="ml-auto md:ml-0 lg:hidden">
            <MobileNav />
          </div>
        </Container>
      </header>
    </>
  );
}
