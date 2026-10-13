import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Printable A4 sheets: no site header or footer, never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PrintLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-sunken py-8 print:bg-white print:py-0">{children}</main>;
}
