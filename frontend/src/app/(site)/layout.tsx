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
      <main id="main" className="flex-1">
        <SignedOutNotice />
        {children}
      </main>
      <Footer />
    </>
  );
}
