"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { loginHref } from "@/lib/auth-client";

/**
 * "Log in", coming back afterwards to this page with its filters. The query
 * string is read when clicked, since filters change without a navigation.
 */
export function LoginLink({ className }: { className: string }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <Link
      href={loginHref(pathname)}
      className={className}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        router.push(loginHref(window.location.pathname, window.location.search));
      }}
    >
      Log in
    </Link>
  );
}
