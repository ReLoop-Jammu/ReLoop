import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HeaderSearch } from "./HeaderSearch";
import { MobileNav } from "./MobileNav";
import { NAV_LINKS } from "./nav-links";

export function Header() {
  return (
    <>
      <div className="bg-accent text-primary-strong py-2 text-[11px] font-bold sm:text-[13px]">
        <Container className="flex justify-between gap-4">
          <span>♻ Giving electronics a second life</span>
          <span className="hidden sm:inline">
            Collection hub: Jammu, J&amp;K · Buyers across India
          </span>
        </Container>
      </div>
      <header className="border-primary/15 bg-surface/90 sticky top-0 z-40 border-b backdrop-blur-lg">
        <Container className="relative flex flex-wrap items-center gap-x-6 gap-y-3 py-3 md:h-[74px] md:flex-nowrap md:py-0">
          <Link href="/" aria-label="ReLoop home" className="shrink-0">
            <Logo id="header" />
          </Link>
          <HeaderSearch className="order-last w-full md:order-none md:max-w-md md:flex-1" />
          <nav aria-label="Main" className="ml-auto hidden md:block">
            <ul className="flex gap-5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-primary-strong hover:text-primary text-sm font-semibold whitespace-nowrap"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ButtonLink href="/sell" className="hidden md:inline-flex">
            ＋ Sell / List
          </ButtonLink>
          <div className="ml-auto md:hidden">
            <MobileNav />
          </div>
        </Container>
      </header>
    </>
  );
}
