// Leaflet's map styles (about 4 KB compressed) load with the site layout, not
// with /locations alone: links to /locations are prefetched on every page, and
// a page-only stylesheet would be preloaded there unused.
import "leaflet/dist/leaflet.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SignedOutNotice } from "@/components/layout/SignedOutNotice";
import { SkipLink } from "@/components/layout/SkipLink";

/** Public website chrome: header, main content, footer. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main" className="relative isolate flex-1">
        {/* A soft brand glow and grid behind the top of every page. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden"
        >
          <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="absolute -top-48 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] opacity-80" />
          <div className="absolute -top-32 right-[8%] h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-gold-100),transparent)]" />
        </div>
        <SignedOutNotice />
        <p
          lang="hi"
          className="hi-missing border-b border-line bg-gold-100 px-4 py-2 text-center text-sm text-ink"
        >
          इस पेज का ज़्यादातर हिस्सा अभी अंग्रेज़ी में है। मदद चाहिए तो हमें WhatsApp करें।
        </p>
        {children}
      </main>
      <Footer />
    </>
  );
}
