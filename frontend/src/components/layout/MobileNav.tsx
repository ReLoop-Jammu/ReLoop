"use client";

import { ChevronDown, Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { isActive, NAV_GROUPS } from "@/config/navigation";
import { CHANGE_PASSWORD_PATH } from "@/lib/auth-client";
import { roleLabel, useAccess } from "@/lib/use-access";
import { HeaderSearch } from "./HeaderSearch";
import { ReportProblem } from "./ReportProblem";
import { useNotifications } from "@/features/account/notifications-store";
import { LoginLink } from "./LoginLink";
import { useDisclosure } from "./use-disclosure";

/** Below 1024 px: everything the desktop header has, in one panel. */
export function MobileNav() {
  const pathname = usePathname();
  const { open, root, button, toggle } = useDisclosure();
  const panelId = useId();
  const a = useAccess();
  const notes = useNotifications();
  const unread = a.state === "signed-out" ? 0 : (notes?.filter((n) => !n.read_at).length ?? 0);
  const access = a.state === "ready" ? a.access : null;

  return (
    <div ref={root}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="grid size-11 place-items-center rounded-full border border-line-strong bg-surface text-ink transition hover:bg-sunken"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-canvas shadow-lift"
      >
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
          <HeaderSearch />
          <nav aria-label="Main">
            <ul className="divide-y divide-line">
              {NAV_GROUPS.map((g) => (
                <li key={g.key}>
                  <details
                    open={g.links.some((l) => isActive(pathname, l.href)) || undefined}
                    className="group"
                  >
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold text-ink">
                      {g.label}
                      <ChevronDown
                        className="size-4 transition group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <ul className="pb-2">
                      {g.links.map((l) => (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            aria-current={isActive(pathname, l.href) ? "page" : undefined}
                            className="flex min-h-11 items-center rounded-lg px-3 text-ink-soft aria-[current=page]:bg-brand-50 aria-[current=page]:font-semibold aria-[current=page]:text-brand-700"
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </nav>
          <div className="rounded-card border border-line bg-surface p-3">
            {a.state === "signed-out" ? (
              <div className="grid grid-cols-2 gap-2">
                <LoginLink className={buttonClasses({ variant: "secondary" })} />
                <Link href="/register" className={buttonClasses({ variant: "ghost" })}>
                  Create account
                </Link>
              </div>
            ) : (
              <div className="grid gap-1 text-sm">
                <p className="px-2 py-1">
                  <span className="font-semibold">{access?.name ?? "Signed in"}</span>
                  <span className="text-muted">
                    {" "}
                    ({a.state === "loading" ? "checking…" : roleLabel(access)})
                  </span>
                </p>
                {access?.is_staff && (
                  <Link
                    href="/hub"
                    className="flex min-h-11 items-center rounded-lg px-2 font-semibold text-brand-700 hover:bg-sunken"
                  >
                    Staff hub
                  </Link>
                )}
                <Link
                  href="/account"
                  className="flex min-h-11 items-center rounded-lg px-2 hover:bg-sunken"
                >
                  My account
                </Link>
                <Link
                  href="/account/requests"
                  className="flex min-h-11 items-center rounded-lg px-2 hover:bg-sunken"
                >
                  My requests
                </Link>
                <Link
                  href="/account/notifications"
                  className="flex min-h-11 items-center rounded-lg px-2 hover:bg-sunken"
                >
                  Notifications
                  {unread > 0 && (
                    <span className="ml-2 rounded-full bg-danger px-1.5 text-xs font-semibold text-white tabular-nums">
                      <span aria-hidden="true">{unread}</span>
                      <span className="sr-only">, {unread} unread</span>
                    </span>
                  )}
                </Link>
                <Link
                  href="/account/settings"
                  className="flex min-h-11 items-center rounded-lg px-2 hover:bg-sunken"
                >
                  Profile and settings
                </Link>
                <Link
                  href={CHANGE_PASSWORD_PATH}
                  className="flex min-h-11 items-center rounded-lg px-2 hover:bg-sunken"
                >
                  Change password
                </Link>
              </div>
            )}
          </div>
          <Link href="/sell" className={buttonClasses({ size: "lg", className: "w-full" })}>
            <Plus className="size-4" aria-hidden="true" />
            Sell to us
          </Link>
          <p className="text-center text-sm">
            <ReportProblem className="font-medium text-brand-600 underline" />
          </p>
        </div>
      </div>
    </div>
  );
}
