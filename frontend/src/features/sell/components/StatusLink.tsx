"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";

/** After a request is saved: its private status page, and where else to find it. */
export function StatusLink({ token, linked }: { token: string; linked: boolean }) {
  const [copied, setCopied] = useState(false);
  const path = `/status/${token}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="mb-4 rounded-card border border-line bg-surface p-5">
      <p className="font-semibold text-ink">Your request is saved</p>
      <p className="mt-1 text-sm text-ink-soft">
        {linked
          ? "Follow it on your account under My requests, or with this private link."
          : "Keep this private link to see where your request stands. Anyone with the link sees its stage, never your details."}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href={path} className={buttonClasses({ variant: "secondary", size: "sm" })}>
          <ExternalLink className="size-4" aria-hidden="true" /> Open the status page
        </Link>
        <button
          type="button"
          onClick={() => void copy()}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Link copied" : "Copy the link"}
        </button>
        {linked && (
          <Link
            href="/account/requests"
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            My requests
          </Link>
        )}
      </div>
    </div>
  );
}
