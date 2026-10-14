"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { useAccess } from "@/lib/use-access";

const noSubscribe = () => () => {};
// Read once per page load: logging out lands on /?signed-out=1 with a full load.
let flagged: boolean | null = null;
const readFlag = () => {
  flagged ??= new URLSearchParams(window.location.search).get("signed-out") === "1";
  return flagged;
};

/**
 * "You're logged out", on the home page right after logging out. The flag
 * leaves the address at once (so a reload or a shared link doesn't repeat
 * it), and the notice goes on the first navigation or once signed in again.
 */
export function SignedOutNotice() {
  const pathname = usePathname();
  const a = useAccess();
  const show = useSyncExternalStore(noSubscribe, readFlag, () => false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!show) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("signed-out")) return;
    url.searchParams.delete("signed-out");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [show]);
  useEffect(() => {
    if (pathname !== "/") flagged = false;
  }, [pathname]);
  if (!show || hidden || pathname !== "/" || a.state !== "signed-out") return null;
  return (
    <Container className="pt-4">
      <div className="relative">
        <Notice tone="success" role="status" title="You're logged out" className="pr-12">
          Log in again any time from the top of the page.
        </Notice>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Dismiss"
          className="absolute top-2 right-2 grid size-10 place-items-center rounded-full text-ink-soft hover:bg-white/60"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </Container>
  );
}
