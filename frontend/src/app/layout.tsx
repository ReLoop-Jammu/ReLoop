import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono, Outfit } from "next/font/google";
import { SimulationBanner } from "@/components/layout/SimulationBanner";
import { env } from "@/lib/env";
import { IS_SIMULATION } from "@/lib/environment";
import { SITE } from "@/lib/site";
import "./globals.css";

// The business plan's type: Outfit for headings, Instrument Sans for text,
// JetBrains Mono only for real identifiers (RL-JMU tags, receipt numbers).
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
    default: "ReLoop Jammu — Graded used electronics, collected in Jammu",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${outfit.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <SimulationBanner />
        {children}
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
