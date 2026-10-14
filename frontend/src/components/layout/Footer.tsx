import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
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
    <footer className="mt-auto bg-brand-950 text-white/75">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Link href="/" aria-label="ReLoop home">
            <Logo id="footer" inverted />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            ReLoop buys used and broken electronics in Jammu, grades every item at one hub, resells
            what still works and sends only what is truly dead to an authorised recycler.
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
      <div className="border-t border-white/10">
        <Container className="py-5 text-sm text-white/60">
          © {new Date().getFullYear()} ReLoop Jammu
        </Container>
      </div>
    </footer>
  );
}
