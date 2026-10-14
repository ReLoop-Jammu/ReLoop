"use client";

import { CATEGORIES, PART_TYPES, type Category, type PartType } from "@/features/inventory/model";
import { authenticatedFetch } from "@/lib/auth-client";
import { allPages } from "@/lib/pages";

export type ReferencePrice = {
  id: string;
  category: Category;
  part_type: PartType | null;
  brand: string;
  model: string;
  low_paise: number;
  typical_paise: number;
  high_paise: number;
  source: string;
  checked_on: string;
  note: string;
};
export type NewReference = Omit<ReferencePrice, "id">;

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await authenticatedFetch(`/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await r.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!r.ok) {
    const m = data && typeof data === "object" && "message" in data ? String(data.message) : "";
    throw new Error(
      /one_per_model|duplicate/.test(m)
        ? "There is already a reference for that category, brand and model. Edit it instead."
        : m || "That wasn't saved.",
    );
  }
  return data as T;
}

const COLS =
  "id,category,part_type,brand,model,low_paise,typical_paise,high_paise,source,checked_on,note";
export const listReferences = () =>
  allPages<ReferencePrice>((headers) =>
    call<ReferencePrice[]>(`reference_prices?select=${COLS}&order=category,brand,model,id`, {
      headers,
    }),
  ).then((rows) =>
    rows.map((r) => ({
      ...r,
      low_paise: Number(r.low_paise),
      typical_paise: Number(r.typical_paise),
      high_paise: Number(r.high_paise),
    })),
  );
export const saveReference = (r: NewReference, id?: string) =>
  id
    ? call<unknown[]>(`reference_prices?id=eq.${id}&select=id`, {
        method: "PATCH",
        body: JSON.stringify(r),
      })
    : call<unknown[]>("reference_prices?select=id", { method: "POST", body: JSON.stringify(r) });
export const deleteReference = (id: string) =>
  call<unknown[]>(`reference_prices?id=eq.${id}&select=id`, { method: "DELETE" });

// ---------------------------------------------------------------- CSV

export const CSV_HEADER = [
  "category",
  "part_type",
  "brand",
  "model",
  "low_inr",
  "typical_inr",
  "high_inr",
  "source",
  "checked_on",
] as const;

/** A template with one example row per kind of reference. */
export const csvTemplate = () =>
  [
    CSV_HEADER.join(","),
    "laptop,,Dell,Latitude 5490,12000,14500,17000,OLX Jammu: 4 listings,2026-11-01",
    "phone,,,,3500,5000,6500,Cashify used prices,2026-11-01",
    "part,ram,,,600,900,1300,Repairer price list,2026-11-01",
  ].join("\r\n") + "\r\n";

/** Splits one CSV line, honouring quotes. */
function cells(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const rupees = (v: string) => Math.round(Number(v.replace(/[₹,\s]/g, "")) * 100);

/**
 * Reads a filled-in template. Returns the rows to save and, for each line
 * that can't be used, why (line numbers count the header as line 1).
 */
export function parseReferenceCsv(text: string): { rows: NewReference[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows: NewReference[] = [];
  const errors: string[] = [];
  const header = cells(lines[0] ?? "").map((h) => h.toLowerCase());
  if (CSV_HEADER.some((h, i) => header[i] !== h))
    return { rows, errors: [`The first line must be: ${CSV_HEADER.join(",")}`] };
  lines.slice(1).forEach((line, i) => {
    const n = i + 2;
    const [category, part, brand, model, low, typical, high, source, checked] = cells(line);
    const cat = CATEGORIES.find((c) => c.value === category)?.value;
    const partType = part ? PART_TYPES.find((p) => p.value === part)?.value : null;
    const [lo, mid, hi] = [rupees(low ?? ""), rupees(typical ?? ""), rupees(high ?? "")];
    const problem = !cat
      ? `unknown category "${category}"`
      : (cat === "part") !== Boolean(partType)
        ? "parts need a part type (and only parts)"
        : ![lo, mid, hi].every((v) => Number.isFinite(v) && v > 0) || lo > mid || mid > hi
          ? "prices must be numbers with low ≤ typical ≤ high"
          : !source || source.length < 3
            ? "add where the prices come from"
            : !/^\d{4}-\d{2}-\d{2}$/.test(checked ?? "")
              ? "checked_on must be a date like 2026-11-01"
              : null;
    if (problem) errors.push(`Line ${n}: ${problem}.`);
    else
      rows.push({
        category: cat!,
        part_type: partType ?? null,
        brand: brand ?? "",
        model: model ?? "",
        low_paise: lo,
        typical_paise: mid,
        high_paise: hi,
        source: source!,
        checked_on: checked!,
        note: "",
      });
  });
  return { rows, errors };
}
