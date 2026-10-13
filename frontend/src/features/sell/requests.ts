/** Validation for public requests (reservations, enquiries, institution pickups). */

export const REQUEST_KINDS = ["reservation", "enquiry", "institution_pickup"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

const PHONE_KEYS = ["phone"];
const NAME_KEYS = ["name", "contact"];

export type CleanRequest = {
  kind: RequestKind;
  fields: Record<string, string>;
  itemId: string | null;
};

/** Checks and trims a request body. Returns an error message for the visitor, or the clean request. */
export function cleanRequest(body: unknown): CleanRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Please fill in the form." };
  const b = body as Record<string, unknown>;
  if (!REQUEST_KINDS.includes(b.kind as RequestKind)) return { error: "Unknown request." };
  const kind = b.kind as RequestKind;
  if (!b.fields || typeof b.fields !== "object" || Array.isArray(b.fields)) {
    return { error: "Please fill in the form." };
  }
  const entries = Object.entries(b.fields as Record<string, unknown>);
  if (entries.length > 20) return { error: "Too many fields." };
  const fields: Record<string, string> = {};
  for (const [k, v] of entries) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(k) || typeof v !== "string") continue;
    const value = v.trim().slice(0, 1000);
    if (value) fields[k] = value;
  }
  const name = NAME_KEYS.map((k) => fields[k]).find(Boolean);
  const phone = PHONE_KEYS.map((k) => fields[k]).find(Boolean);
  if (!name) return { error: "Please add your name." };
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return { error: "Enter a phone number with at least 10 digits." };
  }
  const itemId =
    typeof b.itemId === "string" && /^RL-[A-Z]{3}-\d{4,}$/.test(b.itemId) ? b.itemId : null;
  if ((kind === "reservation" || kind === "enquiry") && !itemId) {
    return { error: "Which item is this about?" };
  }
  if (JSON.stringify(fields).length > 7000) return { error: "That's too long. Please shorten it." };
  return { kind, fields, itemId };
}
