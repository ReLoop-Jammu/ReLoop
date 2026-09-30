"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { NAV_LINKS } from "./nav-links";

export function MobileNav() {
  const pathname = usePathname();
  const panelId = useId();
  // Remember which page the menu was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="border-line bg-surface text-primary grid size-11 place-items-center rounded-xl border"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <nav
        id={panelId}
        aria-label="Main"
        className={cn(
          "border-line bg-surface shadow-card absolute inset-x-0 top-full border-b",
          open ? "block" : "hidden",
        )}
      >
        <ul className="mx-auto flex max-w-[1180px] flex-col px-4 py-2">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                className="text-primary-strong aria-[current=page]:text-primary block rounded-lg px-2 py-3 font-semibold"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="py-2">
            <Link
              href="/sell"
              className="bg-primary block rounded-xl px-4 py-3 text-center font-bold text-white"
            >
              ＋ Sell / List
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
