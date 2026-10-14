"use client";

import { usePathname } from "next/navigation";
import { IS_SIMULATION } from "@/lib/environment";
import { SITE } from "@/lib/site";

/** "Report a problem" with the page's address filled in (WhatsApp, or email). */
export function ReportProblem({ className }: { className?: string }) {
  const pathname = usePathname();
  if (IS_SIMULATION) {
    return <span className={className}>Report a problem: not available in the simulation</span>;
  }
  // The public address is the same on the server and in the browser (no hydration mismatch).
  const text = `Hi ReLoop, I found a problem on ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${pathname}: `;
  const href = SITE.whatsapp
    ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`
    : SITE.supportEmail
      ? `mailto:${SITE.supportEmail}?subject=${encodeURIComponent("Problem on the ReLoop site")}&body=${encodeURIComponent(text)}`
      : null;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      Report a problem<span className="sr-only"> (opens WhatsApp or email)</span>
    </a>
  );
}
