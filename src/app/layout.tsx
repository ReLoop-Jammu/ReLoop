import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "ReLoop Jammu — Used electronics & e-waste marketplace",
    template: "%s · ReLoop Jammu",
  },
  description:
    "Buy, sell and recover value from used electronics, repairable devices and reusable components. Collected in Jammu, connected to buyers across India.",
  applicationName: "ReLoop",
  openGraph: { type: "website", siteName: "ReLoop Jammu", locale: "en_IN" },
};

export const viewport: Viewport = {
  themeColor: "#1e6b9e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#main"
          className="bg-primary sr-only z-50 rounded-lg px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
