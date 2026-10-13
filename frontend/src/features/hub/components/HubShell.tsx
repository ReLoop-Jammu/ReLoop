"use client";

import {
  BadgeCheck,
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
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { logoutAccount } from "@/lib/auth-client";
import { cn } from "@/lib/utils/cn";
import { HUB_ERROR_EVENT } from "../useHubData";
import { RequireRole } from "./RequireRole";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/hub", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hub/intake", label: "Intake", icon: PackagePlus },
  { href: "/hub/items", label: "Items", icon: ClipboardList },
  { href: "/hub/partners", label: "Shops & institutions", icon: Store },
  { href: "/hub/handovers", label: "Recycler handovers", icon: Recycle },
  { href: "/hub/shops", label: "Shop verification", icon: BadgeCheck },
  { href: "/hub/data", label: "Data & exports", icon: Database },
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
        {SHARED_DATABASE ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken px-4 py-2 text-xs text-ink-soft sm:px-8">
            <span>
              <strong>Shared database:</strong> everything you save here is stored for all hub
              staff.
            </span>
            <SignOut />
          </div>
        ) : (
          <p className="border-b border-gold-400/50 bg-gold-100 px-4 py-2 text-xs text-gold-700 sm:px-8">
            <strong>This device only:</strong> hub data is saved in this browser and is not shared.
            Use one hub laptop and export a backup every day from{" "}
            <Link href="/hub/data" className="underline">
              Data &amp; exports
            </Link>
            .
          </p>
        )}
        <HubErrors />
        <main id="main" className="px-4 py-6 sm:px-8 sm:py-8">
          {SHARED_DATABASE ? <RequireRole role="staff">{children}</RequireRole> : children}
        </main>
      </div>
    </div>
  );
}

function SignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="font-semibold text-brand-600 underline"
      onClick={() => void logoutAccount().then(() => router.push("/login?next=%2Fhub"))}
    >
      Log out
    </button>
  );
}

/** Shows the latest error from loading or saving hub data, so nothing fails silently. */
function HubErrors() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const show = (e: Event) => setMessage((e as CustomEvent<string>).detail);
    window.addEventListener(HUB_ERROR_EVENT, show);
    return () => window.removeEventListener(HUB_ERROR_EVENT, show);
  }, []);
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex justify-between gap-4 bg-danger/10 px-4 py-2 text-sm text-danger sm:px-8"
    >
      {message}
      <button type="button" className="underline" onClick={() => setMessage("")}>
        Dismiss
      </button>
    </p>
  );
}
