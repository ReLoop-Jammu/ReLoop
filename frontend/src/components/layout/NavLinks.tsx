"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { NAV_LINKS } from "./nav-links";

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center">
        {NAV_LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-2 py-2 text-sm font-medium whitespace-nowrap transition 2xl:px-3",
                  active
                    ? "bg-ink/[0.06] text-ink"
                    : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
