import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FOOTER_EXTRA, NAV_GROUPS, type NavGroup } from "@/config/navigation";
import { getSiteSettings } from "@/features/settings/server";
import { ReportProblem } from "./ReportProblem";

function LinkColumn({ group }: { group: NavGroup }) {
  return (
    <nav aria-label={group.label}>
      <h2 className="font-sans text-sm font-semibold tracking-normal text-white">{group.label}</h2>
      <ul className="mt-3 space-y-1 text-sm">
        {group.links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-8 items-center transition hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The full sitemap of public pages, plus contact and "report a problem". */
export async function Footer() {
  const site = await getSiteSettings();
  return (
    <footer className="relative mt-auto overflow-hidden bg-mesh text-white/75">
      <div className="absolute inset-0 bg-dots opacity-30" aria-hidden="true" />
      <Container className="relative pt-16">
        <div className="flex flex-col gap-8 border-b border-white/10 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-2xl font-display text-3xl leading-tight font-bold tracking-tight text-white sm:text-5xl">
            Jammu&apos;s loop for used electronics.{" "}
            <span className="text-gold-400">Tested, graded, kept in use.</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/shop" variant="gold" size="lg">
              Shop graded stock <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              href="/sell"
              size="lg"
              className="bg-white/10 bg-none text-white shadow-none ring-white/25 hover:bg-white/15"
            >
              Sell to ReLoop
            </ButtonLink>
          </div>
        </div>
      </Container>
      <Container className="relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Link href="/" aria-label="ReLoop home">
            <Logo id="footer" inverted />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            ReLoop buys used and broken electronics from Jammu&apos;s repair shops, retailers and
            institutions, tests and grades them at one hub, resells what still works and hands scrap
            to VRRG Group, our dismantling partner, by weight.
          </p>
          {site.supportPhone && (
            <p className="mt-4 text-sm text-white">WhatsApp {site.supportPhone}</p>
          )}
          <p className="mt-2 text-sm">
            <ReportProblem className="underline underline-offset-2 hover:text-white" />
          </p>
        </div>
        <div className="grid gap-8 sm:col-span-1 lg:col-span-3 lg:grid-cols-3">
          {[...NAV_GROUPS, ...FOOTER_EXTRA].map((g) => (
            <LinkColumn key={g.key} group={g} />
          ))}
        </div>
      </Container>
      <div className="relative border-t border-white/10">
        <Container className="py-5 text-sm text-white/60">
          © {new Date().getFullYear()} ReLoop Jammu
        </Container>
      </div>
    </footer>
  );
}
