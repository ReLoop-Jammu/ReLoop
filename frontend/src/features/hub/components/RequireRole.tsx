"use client";

import { buttonClasses } from "@/components/ui/Button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { CHANGE_PASSWORD_PATH, mustChangePassword } from "@/lib/auth-client";
import { gateState, hasRole, isSignedIn, type StaffRole } from "@/lib/roles";

const noSubscribe = () => () => {};

/**
 * Shows its children only to signed-in users with the given role. The
 * database still enforces every permission; this keeps the screens away from
 * everyone else.
 */
export function RequireRole({ role, children }: { role: StaffRole; children: ReactNode }) {
  const pathname = usePathname();
  const signedIn = useSyncExternalStore(noSubscribe, isSignedIn, () => false);
  const search = useSyncExternalStore(
    noSubscribe,
    () => window.location.search,
    () => "",
  );
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    // After an admin reset the database denies every role until a new password is set.
    Promise.all([mustChangePassword(), hasRole(role)])
      .then(([change, yes]) => {
        if (!alive) return;
        setMustChange(change);
        setAllowed(yes);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [role, signedIn]);

  const state = gateState({ signedIn, allowed, failed });
  if (mustChange) {
    return (
      <div className="max-w-lg rounded-card border border-line bg-surface p-6">
        <ShieldAlert className="size-6 text-brand-600" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold">Choose a new password first</h1>
        <p className="mt-2 text-sm text-muted">
          An admin reset your password. Set your own before using the hub.
        </p>
        <Link
          href={`${CHANGE_PASSWORD_PATH}?next=${encodeURIComponent(pathname + search)}`}
          className={buttonClasses({ className: "mt-4" })}
        >
          Change password
        </Link>
      </div>
    );
  }
  if (state === "allowed") return children;
  if (state === "checking") {
    return (
      <p role="status" className="text-sm text-muted">
        Checking your access…
      </p>
    );
  }

  const who = role === "admin" ? "ReLoop admins" : "ReLoop hub staff";
  return (
    <div className="max-w-lg rounded-card border border-line bg-surface p-6">
      <ShieldAlert className="size-6 text-brand-600" aria-hidden="true" />
      <h1 className="mt-3 text-xl font-bold">
        {state === "signed-out"
          ? "Log in to continue"
          : state === "error"
            ? "We couldn't check your access"
            : `For ${who} only`}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {state === "signed-out" &&
          `This page is for ${who}. Log in with your ReLoop account and you'll come back here.`}
        {state === "denied" &&
          (role === "admin"
            ? "Your account can use the hub, but not this admin page. Ask an admin if you need something from it."
            : "Your account doesn't have access to the hub. If you work at the hub, ask an admin to add you to the team.")}
        {state === "error" && "Log in again and retry. If it keeps happening, tell an admin."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {state !== "denied" && (
          <Link
            href={`/login?next=${encodeURIComponent(pathname + search)}`}
            className={buttonClasses()}
          >
            Log in
          </Link>
        )}
        {state === "denied" && role === "admin" && (
          <Link href="/hub" className={buttonClasses()}>
            Back to the hub overview
          </Link>
        )}
        {state === "denied" && role === "staff" && (
          <Link href="/account" className={buttonClasses()}>
            Go to your account
          </Link>
        )}
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Public site
        </Link>
      </div>
    </div>
  );
}
