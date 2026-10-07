"use client";

import { Check, Copy, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { handoffChannels } from "../handoff";

type Props = { subject: string; text: string; onReset?: () => void };

/** Shown after a form is filled: sends the request by WhatsApp or email, or copies it. */
export function HandoffPanel({ subject, text, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const channels = handoffChannels(subject, text);

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
          Our WhatsApp number and email will be added here shortly. Meanwhile, copy your request and
          keep it handy.
        </p>
      )}
    </div>
  );
}
