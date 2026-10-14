"use client";

import { ExternalLink, Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { logoutAccount } from "@/lib/auth-client";
import { useAccess } from "@/lib/use-access";
import { cn } from "@/lib/utils/cn";
import { useHubBadges } from "../badges";
import { badgeCount, HUB_TOOLS, isToolActive, TOOL_GROUPS } from "../tools";
import { HUB_ERROR_EVENT } from "../useHubData";
import { RequireRole } from "./RequireRole";

/**
 * The menu: admin screens only for admins (on a hub laptop without the shared
 * database there are no accounts, so every screen is listed).
 */
function useMenu() {
  const a = useAccess();
  const admin = !SHARED_DATABASE || (a.state === "ready" && Boolean(a.access?.is_admin));
  return HUB_TOOLS.filter((t) => t.role === "staff" || admin);
}

export function HubShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
      <aside className="border-b border-line bg-brand-950 text-white lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
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
        <HubSearch />
        <nav aria-label="Hub" className="overflow-x-auto px-2 pb-3 lg:px-3">
          <HubMenu pathname={pathname} />
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
  return (
    <button
      type="button"
      className="font-semibold text-brand-600 underline"
      onClick={() => void logoutAccount().then(() => window.location.replace("/?signed-out=1"))}
    >
      Log out
    </button>
  );
}

function HubMenu({ pathname }: { pathname: string }) {
  const tools = useMenu();
  const badges = useHubBadges();
  return (
    <div className="flex gap-1 lg:flex-col lg:gap-4">
      {TOOL_GROUPS.map((group) => {
        const inGroup = tools.filter((t) => t.group === group);
        if (!inGroup.length) return null;
        return (
          <div key={group} className="flex gap-1 lg:block">
            <p className="hidden px-3 pb-1 text-xs font-medium text-white/50 lg:block">{group}</p>
            <ul className="flex gap-1 lg:flex-col">
              {inGroup.map(({ href, label, icon: Icon, badge }) => {
                const active = isToolActive(href, pathname);
                const count = badgeCount({ badge }, badges);
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
                      {count ? (
                        <span className="ml-auto rounded-full bg-gold-400 px-1.5 text-xs font-semibold text-brand-950 tabular-nums">
                          <span aria-hidden="true">{count}</span>
                          <span className="sr-only">, {count} waiting</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Find an item by its RL-JMU tag, a shop or (admins) an account. */
function HubSearch() {
  return (
    <Form
      action="/hub/search"
      role="search"
      aria-label="Search the hub"
      className="px-4 pb-3 lg:px-5"
    >
      <label htmlFor="hub-search" className="sr-only">
        Search the hub
      </label>
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 focus-within:ring-2 focus-within:ring-gold-400">
        <Search className="size-4 text-white/60" aria-hidden="true" />
        <input
          id="hub-search"
          name="q"
          type="search"
          placeholder="RL-JMU tag, shop or person"
          className="min-h-10 w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
        />
      </div>
    </Form>
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
