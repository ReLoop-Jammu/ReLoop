"use client";

import { Check, Copy, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { IS_SIMULATION } from "@/lib/environment";
import { useSiteSettings } from "@/features/settings/context";
import { handoffChannels } from "../handoff";

type Props = { subject: string; text: string; saved?: boolean; onReset?: () => void };

/**
 * Shown after a form is filled. When the request is saved (a ticket for the
 * hub), WhatsApp and email are optional extras; when it couldn't be saved,
 * they are how the request reaches ReLoop.
 */
export function HandoffPanel({ subject, text, saved = true, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const channels = handoffChannels(subject, text, useSiteSettings());

  if (saved) {
    if (channels.length === 0) return null;
    return (
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <p className="font-semibold text-ink">Want a quicker reply? (optional)</p>
        <p className="mt-1 text-sm text-ink-soft">
          You don&apos;t need to do anything else. If you like, also send us the details:
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {channels.map((c) => (
            <a
              key={c.kind}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              {c.kind === "whatsapp" ? (
                <MessageCircle className="size-4" aria-hidden="true" />
              ) : (
                <Mail className="size-4" aria-hidden="true" />
              )}
              {c.kind === "whatsapp" ? "Message us on WhatsApp" : "Email us"}
            </a>
          ))}
        </div>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div role="status" className="rounded-card border border-grade-a/30 bg-grade-a-bg p-5 sm:p-6">
      <p className="flex items-center gap-2 font-semibold text-grade-a">
        <Check className="size-5" aria-hidden="true" />
        Almost done: send this to ReLoop
      </p>
      <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-surface p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">
        {text}
      </pre>
      <div className="mt-4 flex flex-wrap gap-3">
        {channels.map((c) => (
          <a
            key={c.kind}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses()}
          >
            {c.kind === "whatsapp" ? (
              <MessageCircle className="size-4" aria-hidden="true" />
            ) : (
              <Mail className="size-4" aria-hidden="true" />
            )}
            {c.label}
          </a>
        ))}
        <button type="button" onClick={copy} className={buttonClasses({ variant: "secondary" })}>
          <Copy className="size-4" aria-hidden="true" />
          {copied ? "Copied" : "Copy request"}
        </button>
        {onReset && (
          <button type="button" onClick={onReset} className={buttonClasses({ variant: "ghost" })}>
            Edit details
          </button>
        )}
      </div>
      {channels.length === 0 && (
        <p className="mt-4 text-sm text-ink-soft">
          {IS_SIMULATION
            ? "This is the simulation: no WhatsApp message or email is sent."
            : "Our WhatsApp number and email will be added here shortly. Meanwhile, copy your request and keep it handy."}
        </p>
      )}
    </div>
  );
}
