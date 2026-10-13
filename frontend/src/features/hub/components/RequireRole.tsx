"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
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
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    hasRole(role)
      .then((yes) => alive && setAllowed(yes))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [role, signedIn]);

  const state = gateState({ signedIn, allowed, failed });
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
    <div className="max-w-lg rounded-2xl border border-line bg-surface p-6">
      <ShieldAlert className="size-6 text-brand-600" aria-hidden="true" />
      <h1 className="mt-3 text-xl font-bold">
        {state === "signed-out" ? "Log in to continue" : `For ${who} only`}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {state === "signed-out" &&
          `This page is for ${who}. Log in with your ReLoop account to continue.`}
        {state === "denied" && "Your account doesn't have access to this page."}
        {state === "error" && "We couldn't check your access. Log in again and retry."}
      </p>
      {state !== "denied" && (
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="mt-4 inline-flex min-h-10 items-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white"
        >
          Log in
        </Link>
      )}
    </div>
  );
}
