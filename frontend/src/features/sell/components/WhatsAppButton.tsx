"use client";

import { MessageCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { IS_SIMULATION } from "@/lib/environment";
import { useSiteSettings } from "@/features/settings/context";

/** A wa.me click-to-chat link to ReLoop's public WhatsApp number, with the message filled in. */
export function whatsappChatUrl(message: string, whatsapp: string | null) {
  if (IS_SIMULATION) return null; // The simulation never messages the real number.
  return whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : null;
}

type Props = {
  message: string;
  label?: string;
  variant?: "primary" | "secondary";
  className?: string;
};

/** Opens WhatsApp with a ready message. Renders nothing until a public number is set. */
export function WhatsAppButton({
  message,
  label = "Chat on WhatsApp",
  variant = "secondary",
  className,
}: Props) {
  const { whatsapp } = useSiteSettings();
  const href = whatsappChatUrl(message, whatsapp);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses({ variant, size: "lg", className })}
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      {label}
      <span className="sr-only"> (opens WhatsApp in a new tab)</span>
    </a>
  );
}
