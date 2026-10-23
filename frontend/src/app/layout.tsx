import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono, Outfit } from "next/font/google";
import { SimulationBanner } from "@/components/layout/SimulationBanner";
import { SiteSettingsProvider } from "@/features/settings/context";
import { getSiteSettings } from "@/features/settings/server";
import { env } from "@/lib/env";
import { IS_SIMULATION } from "@/lib/environment";
import { LANG_BOOT_SCRIPT } from "@/lib/lang";
import { SITE } from "@/lib/site";
import "./globals.css";

// The business plan's type: Outfit for headings, Instrument Sans for text,
// JetBrains Mono only for real identifiers (item numbers, receipt numbers).
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "ReLoop Jammu — Tested used phones, laptops, computers and parts",
    template: "%s · ReLoop Jammu",
  },
  description: SITE.description,
  applicationName: "ReLoop",
  openGraph: { type: "website", siteName: SITE.name, locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  // The simulation site is never indexed: its data is not real.
  ...(IS_SIMULATION && { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  themeColor: "#f6ede2",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <html
      lang="en-IN"
      className={`${outfit.variable} ${instrument.variable} ${jetbrains.variable}`}
      // The boot script may set data-lang before React loads.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <SimulationBanner />
        <SiteSettingsProvider value={settings}>{children}</SiteSettingsProvider>
        {/* Cookie-free, anonymous. Switched on with VERCEL_ANALYTICS=on (see docs/team-setup.md). */}
        {env.VERCEL_ANALYTICS === "on" && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
