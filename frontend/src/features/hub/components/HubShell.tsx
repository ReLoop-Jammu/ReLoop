"use client";

import {
  ClipboardList,
  Database,
  ExternalLink,
  LayoutDashboard,
  PackagePlus,
  Recycle,
  Store,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils/cn";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/hub", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hub/intake", label: "Intake", icon: PackagePlus },
  { href: "/hub/items", label: "Items", icon: ClipboardList },
  { href: "/hub/partners", label: "Shops & institutions", icon: Store },
  { href: "/hub/handovers", label: "Recycler handovers", icon: Recycle },
  { href: "/hub/data", label: "Backup & publish", icon: Database },
];

export function HubShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
      <aside className="border-b border-line bg-brand-950 text-white lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Link href="/hub" className="flex items-center gap-2 font-display text-lg font-bold">
            <LogoMark id="hub" inverted className="size-7" />
            ReLoop <span className="font-sans text-xs font-medium text-gold-400">Hub</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white lg:mt-3"
          >
            Public site <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        </div>
        <nav aria-label="Hub" className="overflow-x-auto px-2 pb-3 lg:px-3">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/hub" ? pathname === "/hub" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition",
                      active
                        ? "bg-white/15 font-semibold text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <p className="border-b border-gold-400/50 bg-gold-100 px-4 py-2 text-xs text-gold-700 sm:px-8">
          <strong>This device only:</strong> hub data is saved in this browser and is not shared.
          Use one hub laptop and export a backup every day from{" "}
          <Link href="/hub/data" className="underline">
            Backup &amp; publish
          </Link>
          .
        </p>
        <main id="main" className="px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
