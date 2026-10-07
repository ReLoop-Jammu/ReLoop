import { SITE } from "@/lib/site";

/**
 * Until a shared database exists, public requests reach ReLoop as a
 * prefilled WhatsApp message or email. This builds those links.
 */
export type HandoffChannel = { kind: "whatsapp" | "email"; href: string; label: string };

export function buildRequestText(title: string, fields: [label: string, value: string][]): string {
  const lines = fields.filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
  return [`ReLoop: ${title}`, "", ...lines].join("\n");
}

export function handoffChannels(subject: string, text: string): HandoffChannel[] {
  const channels: HandoffChannel[] = [];
  if (SITE.whatsapp) {
    channels.push({
      kind: "whatsapp",
      label: "Send on WhatsApp",
      href: `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`,
    });
  }
  if (SITE.supportEmail) {
    channels.push({
      kind: "email",
      label: "Send by email",
      href: `mailto:${SITE.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    });
  }
  return channels;
}

/** Indian mobile or landline: 10+ digits, optional +91 / 0 prefix and spaces. */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return /^[+\d\s()-]+$/.test(value.trim()) && digits.length >= 10 && digits.length <= 13;
}
