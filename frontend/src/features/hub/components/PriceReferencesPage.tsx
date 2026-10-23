"use client";

import { Download, Upload } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Table, Td, Th } from "@/components/ui/Table";
import {
  CATEGORIES,
  PART_TYPES,
  categoryLabel,
  type Category,
  type PartType,
} from "@/features/inventory/model";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { useSiteSettings } from "@/features/settings/context";
import {
  csvTemplate,
  deleteReference,
  listReferences,
  parseReferenceCsv,
  saveReference,
  type NewReference,
  type ReferencePrice,
} from "@/features/pricing/references";
import { formatPrice } from "@/lib/utils/money";
import { downloadFile } from "../photos";
import { hubInput, PageTitle, Panel } from "./ui";

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const EMPTY = {
  category: "phone" as Category,
  part_type: "" as PartType | "",
  brand: "",
  model: "",
  low: "",
  typical: "",
  high: "",
  source: "",
  checked_on: today(),
};

export function PriceReferencesPage() {
  const { referenceFreshDays, gradeBFactor } = useSiteSettings();
  return (
    <>
      <PageTitle
        title="Price references"
        description={`What working (grade A) units sell for used, with where and when you checked. A listed item shows the band of the most specific reference (its model, else its category) while it is less than ${referenceFreshDays} days old; grade B uses ${Math.round(gradeBFactor * 100)}% of it. Older references are kept but not shown.`}
      />
      {SHARED_DATABASE ? (
        <References fresh={referenceFreshDays} />
      ) : (
        <p className="text-sm text-muted">Price references are kept in the shared database.</p>
      )}
    </>
  );
}

function References({ fresh }: { fresh: number }) {
  const [rows, setRows] = useState<ReferencePrice[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ReferencePrice | null>(null);
  const load = useCallback(() => {
    listReferences()
      .then((r) => {
        setRows(r);
        setError("");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load."));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // Taken once: "too old to show" is about days, not seconds.
  const [now] = useState(() => Date.now());
  const stale = (d: string) => Date.parse(d) < now - fresh * 86_400_000;
  return (
    <div className="grid gap-6">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <ReferenceForm
        key={editing?.id ?? "new"}
        editing={editing}
        onDone={() => (setEditing(null), load())}
      />
      <CsvTools onDone={load} />
      {!rows ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">
          No references yet. Items show no usual price range until there are.
        </p>
      ) : (
        <Table caption="Reference prices">
          <thead>
            <tr>
              <Th>For</Th>
              <Th className="text-right">Low</Th>
              <Th className="text-right">Typical</Th>
              <Th className="text-right">High</Th>
              <Th>Source</Th>
              <Th>Checked</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  {r.category === "part"
                    ? (PART_TYPES.find((p) => p.value === r.part_type)?.label ?? "Part")
                    : categoryLabel(r.category)}
                  {(r.brand || r.model) && (
                    <span className="block text-xs text-muted">
                      {[r.brand, r.model].filter(Boolean).join(" ")}
                    </span>
                  )}
                </Td>
                <Td className="text-right">{formatPrice(r.low_paise)}</Td>
                <Td className="text-right">{formatPrice(r.typical_paise)}</Td>
                <Td className="text-right">{formatPrice(r.high_paise)}</Td>
                <Td>{r.source}</Td>
                <Td className={stale(r.checked_on) ? "text-warning" : undefined}>
                  {r.checked_on}
                  {stale(r.checked_on) && <span className="block text-xs">too old to show</span>}
                </Td>
                <Td className="whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void deleteReference(r.id)
                        .then(load)
                        .catch((e: unknown) => setError(String(e)))
                    }
                  >
                    Delete
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function ReferenceForm({
  editing,
  onDone,
}: {
  editing: ReferencePrice | null;
  onDone: () => void;
}) {
  const [v, setV] = useState(() =>
    editing
      ? {
          category: editing.category,
          part_type: editing.part_type ?? ("" as PartType | ""),
          brand: editing.brand,
          model: editing.model,
          low: String(editing.low_paise / 100),
          typical: String(editing.typical_paise / 100),
          high: String(editing.high_paise / 100),
          source: editing.source,
          checked_on: editing.checked_on,
        }
      : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof v, value: string) => setV((x) => ({ ...x, [k]: value }));
  function submit(e: FormEvent) {
    e.preventDefault();
    const [low, typical, high] = [v.low, v.typical, v.high].map((x) => Math.round(Number(x) * 100));
    if (
      ![low, typical, high].every((x) => Number.isFinite(x) && x > 0) ||
      low > typical ||
      typical > high
    )
      return setError("Enter prices in rupees, with low ≤ typical ≤ high.");
    if (v.source.trim().length < 3) return setError("Say where the prices come from.");
    if ((v.category === "part") !== Boolean(v.part_type))
      return setError("Parts need a part type.");
    const row: NewReference = {
      category: v.category,
      part_type: v.category === "part" ? (v.part_type as PartType) : null,
      brand: v.brand.trim(),
      model: v.model.trim(),
      low_paise: low,
      typical_paise: typical,
      high_paise: high,
      source: v.source.trim(),
      checked_on: v.checked_on,
      note: "",
    };
    setBusy(true);
    setError("");
    saveReference(row, editing?.id)
      .then(onDone)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "That wasn't saved."))
      .finally(() => setBusy(false));
  }
  const field = (label: string, k: keyof typeof v, extra: Record<string, unknown> = {}) => (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <input
        className={hubInput}
        value={v[k]}
        onChange={(e) => set(k, e.target.value)}
        {...extra}
      />
    </label>
  );
  return (
    <Panel title={editing ? "Edit the reference" : "Add a reference"}>
      <form className="grid gap-3 sm:grid-cols-4" onSubmit={submit} noValidate>
        <label className="grid gap-1 text-xs font-medium">
          Category
          <select
            className={hubInput}
            value={v.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.single}
              </option>
            ))}
          </select>
        </label>
        {v.category === "part" && (
          <label className="grid gap-1 text-xs font-medium">
            Part type
            <select
              className={hubInput}
              value={v.part_type}
              onChange={(e) => set("part_type", e.target.value)}
            >
              <option value="">Choose…</option>
              {PART_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {field("Brand (empty: the whole category)", "brand", { maxLength: 40 })}
        {field("Model (empty: any model)", "model", { maxLength: 80 })}
        {field("Low (₹)", "low", { inputMode: "decimal" })}
        {field("Typical (₹)", "typical", { inputMode: "decimal" })}
        {field("High (₹)", "high", { inputMode: "decimal" })}
        {field("Checked on", "checked_on", { type: "date", max: today() })}
        <label className="grid gap-1 text-xs font-medium sm:col-span-4">
          Where the prices come from (shown to visitors)
          <input
            className={hubInput}
            value={v.source}
            maxLength={200}
            placeholder="For example: OLX Jammu, 4 listings of working units"
            onChange={(e) => set("source", e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
          <Button size="sm" type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add the reference"}
          </Button>
          {editing && (
            <Button size="sm" variant="ghost" type="button" onClick={onDone}>
              Cancel
            </Button>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </form>
    </Panel>
  );
}

function CsvTools({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  async function importFile(file: File) {
    const { rows, errors: bad } = parseReferenceCsv(await file.text());
    setErrors(bad);
    let saved = 0;
    for (const r of rows)
      try {
        await saveReference(r);
        saved++;
      } catch (e) {
        bad.push(
          `${r.category} ${r.brand} ${r.model}: ${e instanceof Error ? e.message : "not saved"}`,
        );
      }
    setErrors([...bad]);
    setMsg(`${saved} reference${saved === 1 ? "" : "s"} added.`);
    onDone();
  }
  return (
    <Panel title="Many at once (CSV)">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          className={buttonClasses({ size: "sm", variant: "secondary" })}
          onClick={() =>
            downloadFile("reloop-price-references-template.csv", csvTemplate(), "text/csv")
          }
        >
          <Download className="size-4" aria-hidden="true" /> Template (CSV)
        </button>
        <label
          className={buttonClasses({
            size: "sm",
            variant: "secondary",
            className: "cursor-pointer",
          })}
        >
          <Upload className="size-4" aria-hidden="true" /> Import a filled-in template
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {msg && (
          <span role="status" className="text-success">
            {msg}
          </span>
        )}
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="mt-3 list-disc pl-5 text-sm text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
