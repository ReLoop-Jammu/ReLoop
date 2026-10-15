import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { NAV_GROUPS } from "@/config/navigation";
import { getSiteSettings } from "@/features/settings/server";
import { IS_SIMULATION } from "@/lib/environment";
import { AccountMenu } from "./AccountMenu";
import { HeaderSearch } from "./HeaderSearch";
import { MobileNav } from "./MobileNav";
import { NavMenu } from "./NavMenu";

export async function Header() {
  const site = await getSiteSettings();
  return (
    <>
      <div className="bg-mesh text-sm text-white/80">
        <Container className="flex min-h-9 items-center justify-between gap-4 py-1.5">
          <p className="flex items-center gap-2">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold-400 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-gold-400" />
            </span>
            Jammu pilot · weekly pickups from partner shops
          </p>
          {site.supportPhone && site.whatsapp && !IS_SIMULATION && (
            <a
              href={`https://wa.me/${site.whatsapp}`}
              className="hidden font-medium whitespace-nowrap text-white hover:underline sm:inline"
            >
              WhatsApp {site.supportPhone}
            </a>
          )}
        </Container>
      </div>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/80 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset] backdrop-blur-xl backdrop-saturate-150">
        <Container className="relative flex h-16 items-center gap-2 lg:h-[76px] lg:gap-3">
          <Link href="/" aria-label="ReLoop home" className="mr-2 shrink-0">
            <Logo id="header" />
          </Link>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center rounded-full bg-sunken/70 p-1 ring-1 ring-line/80 ring-inset">
              {NAV_GROUPS.map((g) => (
                <li key={g.key}>
                  <NavMenu group={g} />
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <HeaderSearch className="hidden w-56 xl:block" />
            <Link
              href="/shop#search"
              className="hidden size-11 place-items-center rounded-full text-ink-soft transition hover:bg-ink/[0.05] hover:text-ink lg:grid xl:hidden"
            >
              <Search className="size-5" aria-hidden="true" />
              <span className="sr-only">Search the shop</span>
            </Link>
            <div className="hidden sm:block">
              <AccountMenu />
            </div>
            <ButtonLink href="/sell" size="sm" className="hidden md:inline-flex">
              <Plus className="size-4" aria-hidden="true" />
              {/* Between 1024 and 1280 px the menu shares the row, so the button is shorter there. */}
              <span className="lg:hidden xl:inline">For shops & institutions</span>
              <span className="hidden lg:inline xl:hidden">Sell to us</span>
            </ButtonLink>
            <div className="lg:hidden">
              <MobileNav />
            </div>
          </div>
        </Container>
      </header>
    </>
  );
}
