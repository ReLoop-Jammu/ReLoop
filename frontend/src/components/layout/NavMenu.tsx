"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { isActive, type NavGroup } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";
import { useDisclosure } from "./use-disclosure";

/** One header group (Buy, Sell, …): a button that opens a panel of its pages. */
export function NavMenu({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const { open, root, button, toggle } = useDisclosure();
  const panelId = useId();
  const current = group.links.some((l) => isActive(pathname, l.href));
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={cn(
          "inline-flex min-h-10 items-center gap-1 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition",
          current || open
            ? "bg-surface text-ink shadow-soft"
            : "text-ink-soft hover:bg-surface/70 hover:text-ink",
        )}
      >
        {group.label}
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full left-0 z-50 mt-3 w-[22rem] animate-rise rounded-card border border-line bg-surface/95 p-2 shadow-float backdrop-blur-xl [animation-duration:0.25s]"
      >
        <ul>
          {group.links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(pathname, l.href) ? "page" : undefined}
                className="block rounded-xl px-3.5 py-3 transition hover:bg-sunken aria-[current=page]:bg-brand-50"
              >
                <span className="block text-sm font-semibold text-ink">{l.label}</span>
                {l.description && (
                  <span className="mt-0.5 block text-sm text-muted">{l.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
