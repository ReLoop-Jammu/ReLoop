"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { CHANGE_PASSWORD_PATH, getSession, type Access } from "@/lib/auth-client";
import { useAccess } from "@/lib/use-access";

/**
 * An account page: sends visitors to log in (and back here afterwards), and a
 * temporary password to the change-password page first. The database decides
 * what each person may read; this only keeps the page tidy.
 */
export function RequireAccount({ children }: { children: (access: Access) => ReactNode }) {
  const a = useAccess();
  const pathname = usePathname();
  const access = a.state === "ready" ? a.access : null;
  useEffect(() => {
    // The first render after loading always reads as signed out, so check the session itself.
    if (a.state === "signed-out" && !getSession()?.access_token)
      window.location.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (access?.must_change_password)
      window.location.replace(`${CHANGE_PASSWORD_PATH}?next=${encodeURIComponent(pathname)}`);
  }, [a.state, access?.must_change_password, pathname]);
  if (a.state !== "ready" || !access || access.must_change_password)
    return (
      <Container className="py-12 sm:py-16">
        <p role="status" className="mx-auto max-w-3xl text-muted">
          {a.state === "ready" && !access
            ? "Your account couldn't load. Check your connection and reload the page."
            : "Loading your account…"}
        </p>
      </Container>
    );
  return children(access);
}
