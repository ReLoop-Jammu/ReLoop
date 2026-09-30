"use client";

import { Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { HeaderSearch } from "./HeaderSearch";
import { NAV_LINKS } from "./nav-links";

export function MobileNav() {
  const pathname = usePathname();
  const panelId = useId();
  // Remember which page the menu was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenOn(open ? null : pathname)}
        className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink transition hover:bg-sunken"
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
        className={cn(
          "absolute inset-x-0 top-full border-b border-line bg-canvas shadow-lift",
          open ? "block" : "hidden",
        )}
      >
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
          <HeaderSearch className="md:hidden" />
          <nav aria-label="Main">
            <ul className="divide-y divide-line">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                    className="block py-3.5 text-base font-medium text-ink aria-[current=page]:text-brand-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href="/sell"
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-600 font-semibold text-white md:hidden"
          >
            <Plus className="size-4" aria-hidden="true" />
            Sell with ReLoop
          </Link>
        </div>
      </div>
    </>
  );
}
