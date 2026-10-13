import { z } from "zod";

/*
 * Input rules shared by the API routes and the forms. Kept free of server-only
 * imports so they can be unit-tested and reused in the browser.
 */

const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

/** Trimmed single-line text with a length range. */
export const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .transform(collapse)
    .pipe(
      z
        .string()
        .min(min, min === 1 ? `${label} is required.` : `${label} is too short.`)
        .max(max, `${label} is too long (maximum ${max} characters).`),
    );

/** Optional trimmed text: missing or blank becomes "". */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .transform((v) => collapse(v ?? ""))
    .pipe(z.string().max(max, `${label} is too long (maximum ${max} characters).`));

/** Free text that may contain line breaks (descriptions, addresses). */
export const longText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").replace(/\r\n/g, "\n").trim())
    .pipe(z.string().max(max, `${label} is too long (maximum ${max} characters).`));

export const email = z
  .string({ error: "Email address is required." })
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address."));

/** Phone numbers as people type them: spaces, dashes, "+91", brackets. */
export const phone = z
  .string({ error: "Phone number is required." })
  .transform((v) => v.replace(/[\s\-().]/g, ""))
  .pipe(z.string().regex(/^\+?\d{10,15}$/, "Enter a phone number with 10 to 15 digits."));

/** GST identification number: 2-digit state, PAN, entity, "Z", checksum. */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const gstin = z
  .string({ error: "GSTIN is required." })
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .pipe(z.string().regex(GSTIN_PATTERN, "Enter a valid 15-character GSTIN."));

export const password = z
  .string({ error: "Password is required." })
  .min(8, "Use at least 8 characters.")
  .max(128, "Password is too long.");

export const ACCOUNT_ROLES = ["buyer", "shop_owner"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const SHOP_CONDITIONS = [
  "Working",
  "Partially working",
  "Broken",
  "Dead / scrap",
  "Untested",
] as const;

/**
 * A photo link is stored for staff only, but it is still untrusted: it must be
 * https, short, have no login details, and must not point at local or
 * private network addresses.
 */
export function isSafeImageUrl(value: string): boolean {
  if (!value || value.length > 1000) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (host.endsWith(".internal")) return false;
  if (host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  return host.includes(".");
}

/** Only ever redirect to a path on this site. */
export function safeNextPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

/** First readable message from a failed parse. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}
