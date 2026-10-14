"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { CATEGORIES } from "@/features/inventory/model";
import { SHARED_DATABASE } from "@/features/inventory/store";
import {
  loadSettings,
  refreshSiteSettings,
  saveSetting,
  type SettingRow,
} from "@/features/settings/admin";
import { DEFAULT_SETTINGS, type AcceptItem, type DropoffShop } from "@/features/settings/defaults";
import { RequireRole } from "./RequireRole";
import { Field, Input, PageTitle, Panel } from "./ui";

type Rows = Record<string, SettingRow>;

export function SettingsPage() {
  return (
    <RequireRole role="admin">
      <Settings />
    </RequireRole>
  );
}

function Settings() {
  const [rows, setRows] = useState<Rows | null>(null);
  const [error, setError] = useState("");
  const reload = () =>
    loadSettings()
      .then(setRows)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Could not load the settings."),
      );
  useEffect(() => {
    if (SHARED_DATABASE) void reload();
  }, []);

  return (
    <>
      <PageTitle
        title="Settings"
        description="What the public site shows and the numbers the hub works with. Changes appear on the site straight away (within a minute at most), and each one is recorded in the audit log."
      />
      {!SHARED_DATABASE ? (
        <p className="text-sm text-muted">Settings are kept in the shared database.</p>
      ) : error ? (
        <Notice tone="danger" role="alert" title="Settings couldn't load">
          {error}
        </Notice>
      ) : !rows ? (
        <p className="text-sm text-muted">Loading settings…</p>
      ) : (
        <div className="grid gap-6">
          <ContactSection rows={rows} onSaved={reload} />
          <DropoffSection rows={rows} onSaved={reload} />
          <AcceptSection rows={rows} onSaved={reload} />
          <CategorySection rows={rows} onSaved={reload} />
          <NumbersSection rows={rows} onSaved={reload} />
        </div>
      )}
    </>
  );
}

const str = (rows: Rows, key: string) =>
  typeof rows[key]?.value === "string" ? (rows[key].value as string) : "";

/** A panel whose Save button stores several keys, with loading, success and error states. */
function Section({
  title,
  description,
  save,
  onSaved,
  children,
}: {
  title: string;
  description?: ReactNode;
  save: () => [string, unknown][] | string;
  onSaved: () => void;
  children: ReactNode;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const pairs = save();
    if (typeof pairs === "string") {
      setError(pairs);
      return;
    }
    setState("saving");
    try {
      for (const [k, v] of pairs) await saveSetting(k, v);
      await refreshSiteSettings();
      setState("saved");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That wasn't saved.");
      setState("idle");
    }
  }
  return (
    <Panel title={title}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {description && <p className="text-sm text-muted">{description}</p>}
        {children}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Save"}
          </Button>
          {state === "saved" && !error && (
            <span role="status" className="text-sm text-success">
              Saved.
            </span>
          )}
          {error && (
            <span role="alert" className="text-sm text-danger">
              {error}
            </span>
          )}
        </div>
      </form>
    </Panel>
  );
}

function ContactSection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const fields = [
    [
      "contact.whatsapp",
      "WhatsApp number",
      "With country code, e.g. 919876543210",
      DEFAULT_SETTINGS.whatsapp,
    ],
    [
      "contact.phone",
      "Phone shown on the site",
      "e.g. +91 98765 43210",
      DEFAULT_SETTINGS.supportPhone,
    ],
    ["contact.email", "Support email", "", DEFAULT_SETTINGS.supportEmail],
    ["contact.hours", "Opening hours", "", DEFAULT_SETTINGS.hours],
    ["hub.address", "Hub address", "", DEFAULT_SETTINGS.hubAddress],
    ["hub.opens", "Hub opening (month and year)", "", DEFAULT_SETTINGS.hubOpens],
  ] as const;
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(([k]) => [k, str(rows, k)])),
  );
  return (
    <Section
      title="Contact details and hours"
      description="Leave a field empty to use the site's built-in value (shown below each field)."
      onSaved={onSaved}
      save={() => {
        const wa = values["contact.whatsapp"].replace(/\D/g, "");
        if (values["contact.whatsapp"] && !/^\d{10,13}$/.test(wa))
          return "Enter the WhatsApp number as digits with the country code.";
        const email = values["contact.email"].trim();
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
          return "Enter a valid email address.";
        return fields.map(([k]) => [
          k,
          values[k].trim() ? (k === "contact.whatsapp" ? wa : values[k].trim()) : null,
        ]);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([k, label, hint, fallback]) => (
          <Field
            key={k}
            label={label}
            hint={hint || (fallback ? `Built-in: ${fallback}` : undefined)}
          >
            <Input
              value={values[k]}
              maxLength={300}
              onChange={(e) => setValues({ ...values, [k]: e.target.value })}
            />
          </Field>
        ))}
      </div>
    </Section>
  );
}

/** Editable rows of small records (shops, accept list): add, change, remove. */
function RowsEditor<T extends Record<string, string>>({
  rows,
  setRows,
  columns,
  blank,
  addLabel,
}: {
  rows: T[];
  setRows: (r: T[]) => void;
  columns: { key: keyof T & string; label: string; wide?: boolean }[];
  blank: T;
  addLabel: string;
}) {
  return (
    <div className="grid gap-3">
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid items-end gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))_auto]"
        >
          {columns.map((c) => (
            <Field key={c.key} label={c.label} className={c.wide ? "sm:col-span-2" : undefined}>
              <Input
                value={row[c.key]}
                maxLength={200}
                onChange={(e) =>
                  setRows(rows.map((r, j) => (j === i ? { ...r, [c.key]: e.target.value } : r)))
                }
              />
            </Field>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
            aria-label={`Remove row ${i + 1}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setRows([...rows, { ...blank }])}
        >
          <Plus className="size-4" aria-hidden="true" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function DropoffSection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  type Row = { name: string; market: string; lat: string; lng: string; description: string };
  const stored = (rows["dropoff.shops"]?.value as DropoffShop[] | undefined) ?? [];
  const [list, setList] = useState<Row[]>(
    stored.map((d) => ({
      name: d.name,
      market: d.market,
      lat: d.lat?.toString() ?? "",
      lng: d.lng?.toString() ?? "",
      description: d.description ?? "",
    })),
  );
  return (
    <Section
      title="Drop-off shops"
      description="Shops (not partner accounts) that accept drop-offs for ReLoop, shown on /locations. Each one is listed there; give a position in Jammu to put it on the map as well."
      onSaved={onSaved}
      save={() => {
        const out: DropoffShop[] = [];
        for (const r of list) {
          if (!r.name.trim() || !r.market.trim())
            return "Every drop-off shop needs a name and a market.";
          const lat = r.lat ? Number(r.lat) : undefined;
          const lng = r.lng ? Number(r.lng) : undefined;
          if (
            (lat !== undefined || lng !== undefined) &&
            !(lat! > 32.6 && lat! < 32.85 && lng! > 74.75 && lng! < 75)
          )
            return `${r.name}: the position must be in Jammu (latitude about 32.7, longitude about 74.86).`;
          out.push({
            name: r.name.trim(),
            market: r.market.trim(),
            ...(lat !== undefined && { lat, lng }),
            ...(r.description.trim() && { description: r.description.trim() }),
          });
        }
        return [["dropoff.shops", out]];
      }}
    >
      <RowsEditor
        rows={list}
        setRows={setList}
        blank={{ name: "", market: "", lat: "", lng: "", description: "" }}
        addLabel="Add a drop-off shop"
        columns={[
          { key: "name", label: "Name" },
          { key: "market", label: "Market" },
          { key: "lat", label: "Latitude" },
          { key: "lng", label: "Longitude" },
          { key: "description", label: "Note", wide: true },
        ]}
      />
    </Section>
  );
}

function AcceptSection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const take = (rows["accept.take"]?.value as AcceptItem[] | undefined)?.length
    ? (rows["accept.take"].value as AcceptItem[])
    : DEFAULT_SETTINGS.acceptTake;
  const dont = (rows["accept.dont"]?.value as string[] | undefined)?.length
    ? (rows["accept.dont"].value as string[])
    : DEFAULT_SETTINGS.acceptDont;
  const [takeRows, setTake] = useState(take.map((t) => ({ ...t })));
  const [dontRows, setDont] = useState(dont.map((text) => ({ text })));
  return (
    <Section
      title="What we accept and what we don't take"
      description="Shown on /what-we-accept."
      onSaved={onSaved}
      save={() => {
        if (takeRows.some((r) => !r.title.trim()) || dontRows.some((r) => !r.text.trim()))
          return "Remove empty rows, or fill them in.";
        return [
          [
            "accept.take",
            takeRows.map((r) => ({ title: r.title.trim(), examples: r.examples.trim() })),
          ],
          ["accept.dont", dontRows.map((r) => r.text.trim())],
        ];
      }}
    >
      <h3 className="text-sm font-semibold">What we take</h3>
      <RowsEditor
        rows={takeRows}
        setRows={setTake}
        blank={{ title: "", examples: "" }}
        addLabel="Add a category"
        columns={[
          { key: "title", label: "Category" },
          { key: "examples", label: "Examples", wide: true },
        ]}
      />
      <h3 className="text-sm font-semibold">What we don&apos;t take</h3>
      <RowsEditor
        rows={dontRows}
        setRows={setDont}
        blank={{ text: "" }}
        addLabel="Add a line"
        columns={[{ key: "text", label: "Item", wide: true }]}
      />
    </Section>
  );
}

function CategorySection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const info =
    (rows["categories.info"]?.value as Record<string, { label?: string; examples?: string }>) ?? {};
  const kg = {
    ...DEFAULT_SETTINGS.weightKg,
    ...((rows["categories.weight_kg"]?.value as Record<string, number>) ?? {}),
  };
  const [values, setValues] = useState(
    Object.fromEntries(
      CATEGORIES.map((c) => [
        c.value,
        { label: info[c.value]?.label ?? "", weight: String(kg[c.value] ?? "") },
      ]),
    ),
  );
  return (
    <Section
      title="Categories"
      description="Display names and the estimated weight per item, used for the kilograms kept out of landfill when an item has no measured weight (always shown as estimated). New categories need a code change."
      onSaved={onSaved}
      save={() => {
        const weights: Record<string, number> = {};
        const labels: Record<string, { label: string }> = {};
        for (const c of CATEGORIES) {
          const v = values[c.value];
          const w = Number(v.weight);
          if (!(w > 0 && w < 200)) return `${c.label}: enter a weight between 0 and 200 kg.`;
          weights[c.value] = w;
          if (v.label.trim()) labels[c.value] = { label: v.label.trim() };
        }
        return [
          ["categories.weight_kg", weights],
          ["categories.info", labels],
        ];
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <div key={c.value} className="grid grid-cols-[1fr_7rem] gap-2">
            <Field label={`${c.label}: display name`} hint={`Built-in: ${c.label}`}>
              <Input
                value={values[c.value].label}
                maxLength={60}
                onChange={(e) =>
                  setValues({ ...values, [c.value]: { ...values[c.value], label: e.target.value } })
                }
              />
            </Field>
            <Field label="kg per item">
              <Input
                inputMode="decimal"
                value={values[c.value].weight}
                onChange={(e) =>
                  setValues({
                    ...values,
                    [c.value]: { ...values[c.value], weight: e.target.value },
                  })
                }
              />
            </Field>
          </div>
        ))}
      </div>
    </Section>
  );
}

function NumbersSection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const num = (k: string, d: number) =>
    typeof rows[k]?.value === "number" ? (rows[k].value as number) : d;
  const handling = (rows["pricing.handling_paise"]?.value as Record<string, number>) ?? {
    A: 10000,
    B: 10000,
    C: 6000,
    D: 0,
  };
  const [v, setV] = useState({
    factor: String(num("pricing.grade_b_factor", 0.75)),
    fresh: String(num("pricing.reference_fresh_days", 180)),
    margin: String(num("pricing.target_margin_pct", 40)),
    racks: String(num("capacity.racks", 300)),
    A: String((handling.A ?? 0) / 100),
    B: String((handling.B ?? 0) / 100),
    C: String((handling.C ?? 0) / 100),
    D: String((handling.D ?? 0) / 100),
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) =>
    setV({ ...v, [k]: e.target.value });
  return (
    <Section
      title="Pricing and capacity"
      description="The grade-B factor and the reference-price window are public (they explain the price bands). The margin target, handling costs and rack capacity are for staff only."
      onSaved={onSaved}
      save={() => {
        const factor = Number(v.factor),
          fresh = Number(v.fresh),
          margin = Number(v.margin),
          racks = Number(v.racks);
        if (!(factor > 0 && factor <= 1))
          return "The grade-B factor is between 0 and 1 (e.g. 0.75).";
        if (!(fresh >= 7 && fresh <= 730))
          return "Reference prices stay current for 7 to 730 days.";
        if (!(margin >= 0 && margin < 100)) return "The margin target is a percentage below 100.";
        if (!(racks >= 10 && racks <= 5000)) return "Rack capacity is between 10 and 5,000 items.";
        const h: Record<string, number> = {};
        for (const g of ["A", "B", "C", "D"] as const) {
          const r = Number(v[g]);
          if (!(r >= 0 && r <= 10000))
            return `Handling for grade ${g}: enter rupees between 0 and 10,000.`;
          h[g] = Math.round(r * 100);
        }
        return [
          ["pricing.grade_b_factor", factor],
          ["pricing.reference_fresh_days", Math.round(fresh)],
          ["pricing.target_margin_pct", margin],
          ["pricing.handling_paise", h],
          ["capacity.racks", Math.round(racks)],
        ];
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Grade-B price factor" hint="B band = factor × A band (plan: 0.75)">
          <Input inputMode="decimal" value={v.factor} onChange={set("factor")} />
        </Field>
        <Field label="Reference prices current for (days)">
          <Input inputMode="numeric" value={v.fresh} onChange={set("fresh")} />
        </Field>
        <Field label="Target margin (% of sale price)">
          <Input inputMode="decimal" value={v.margin} onChange={set("margin")} />
        </Field>
        <Field label="Rack capacity (items)" hint="Plan: about 300">
          <Input inputMode="numeric" value={v.racks} onChange={set("racks")} />
        </Field>
        {(["A", "B", "C", "D"] as const).map((g) => (
          <Field key={g} label={`Handling cost, grade ${g} (₹)`}>
            <Input inputMode="decimal" value={v[g]} onChange={set(g)} />
          </Field>
        ))}
      </div>
    </Section>
  );
}
