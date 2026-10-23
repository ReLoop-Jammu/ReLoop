"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ACTIVE_CATEGORIES } from "@/features/inventory/model";
import { SHARED_DATABASE } from "@/features/inventory/store";
import {
  loadSettings,
  refreshSiteSettings,
  saveSetting,
  type SettingRow,
} from "@/features/settings/admin";
import { DEFAULT_SETTINGS, type AcceptItem } from "@/features/settings/defaults";
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
          <RateCardSection rows={rows} onSaved={reload} />
          <RouteSection rows={rows} onSaved={reload} />
          <AcceptSection rows={rows} onSaved={reload} />
          <CategorySection rows={rows} onSaved={reload} />
          <NumbersSection rows={rows} onSaved={reload} />
          <StaffPlanSection rows={rows} onSaved={reload} />
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
      ACTIVE_CATEGORIES.map((c) => [
        c.value,
        { label: info[c.value]?.label ?? "", weight: String(kg[c.value] ?? "") },
      ]),
    ),
  );
  return (
    <Section
      title="Categories"
      description="Display names and the estimated weight per item, used for kilograms when a tagged device has no measured weight (always shown as estimated). New categories need a code change."
      onSaved={onSaved}
      save={() => {
        const weights: Record<string, number> = {};
        const labels: Record<string, { label: string }> = {};
        for (const c of ACTIVE_CATEGORIES) {
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
        {ACTIVE_CATEGORIES.map((c) => (
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

const rupees = (paise: unknown) => (typeof paise === "number" ? String(paise / 100) : "");
const toPaise = (v: string) => Math.round(Number(v) * 100);

function RateCardSection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const D = DEFAULT_SETTINGS;
  const pick = (k: string, d: number) =>
    typeof rows[k]?.value === "number" ? (rows[k].value as number) : d;
  const [v, setV] = useState({
    screens: rupees(pick("rate_card.screens_paise", D.rateScreensPaise)),
    batteries: rupees(pick("rate_card.batteries_paise", D.rateBatteriesPaise)),
    boards: rupees(pick("rate_card.boards_paise", D.rateBoardsPaise)),
    other: rupees(pick("rate_card.other_paise", D.rateOtherPaise)),
    asOf: str(rows, "rate_card.as_of") || D.rateCardAsOf,
    commission: String(pick("rate_card.commission_pct", D.commissionPct)),
    lotFee: rupees(pick("institution.lot_fee_paise", D.lotFeePaise)),
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) =>
    setV({ ...v, [k]: e.target.value });
  return (
    <Section
      title="Scrap prices and published terms"
      description="The scrap prices per kg, the used parts shop commission and the institution lot fee are published terms: the Scrap prices page and the shop pages show them. Every weigh-in keeps a snapshot of the rates used, so a change never touches earlier receipts."
      onSaved={onSaved}
      save={() => {
        const out: [string, unknown][] = [];
        for (const [k, key, label] of [
          ["screens", "rate_card.screens_paise", "Screens and displays"],
          ["batteries", "rate_card.batteries_paise", "Batteries"],
          ["boards", "rate_card.boards_paise", "Dead motherboards"],
          ["other", "rate_card.other_paise", "Everything else"],
        ] as const) {
          const r = Number(v[k]);
          if (!(r >= 0 && r <= 5000)) return `${label}: enter rupees per kg between 0 and 5,000.`;
          out.push([key, toPaise(v[k])]);
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.asOf))
          return "Enter the scrap prices date as YYYY-MM-DD.";
        const c = Number(v.commission);
        if (!(c >= 0 && c <= 30)) return "The commission is a percentage between 0 and 30.";
        const fee = Number(v.lotFee);
        if (!(fee >= 0 && fee <= 100000)) return "The lot fee is between ₹0 and ₹1,00,000.";
        out.push(["rate_card.as_of", v.asOf], ["rate_card.commission_pct", c]);
        out.push(["institution.lot_fee_paise", toPaise(v.lotFee)]);
        return out;
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Screens and displays (₹ per kg)">
          <Input inputMode="decimal" value={v.screens} onChange={set("screens")} />
        </Field>
        <Field label="Batteries (₹ per kg)">
          <Input inputMode="decimal" value={v.batteries} onChange={set("batteries")} />
        </Field>
        <Field label="Dead motherboards (₹ per kg)">
          <Input inputMode="decimal" value={v.boards} onChange={set("boards")} />
        </Field>
        <Field label="Everything else (₹ per kg)">
          <Input inputMode="decimal" value={v.other} onChange={set("other")} />
        </Field>
        <Field label="Scrap prices date" hint="Shown as “as of” on the Scrap prices page">
          <Input value={v.asOf} onChange={set("asOf")} />
        </Field>
        <Field label="Used parts shop commission (%)">
          <Input inputMode="decimal" value={v.commission} onChange={set("commission")} />
        </Field>
        <Field label="Institution lot fee (₹)">
          <Input inputMode="decimal" value={v.lotFee} onChange={set("lotFee")} />
        </Field>
      </div>
    </Section>
  );
}

type MarketRow = { market: string; day: string; starts: string };

function RouteSection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const stored =
    (rows["route.markets"]?.value as DefaultsMarkets | undefined) ?? DEFAULT_SETTINGS.routeMarkets;
  const [list, setList] = useState<MarketRow[]>(
    Object.entries(stored).map(([market, m]) => ({
      market,
      day: m.day,
      starts: m.starts_on ?? "",
    })),
  );
  return (
    <Section
      title="Route days by market"
      description="Tuesday: the Gandhi Nagar cluster. Friday: the old city. A market that is not listed, or has not started yet, shows “next route day to be confirmed” and is flagged to staff."
      onSaved={onSaved}
      save={() => {
        const out: DefaultsMarkets = {};
        for (const r of list) {
          const name = r.market.trim();
          if (!name) return "Every row needs a market name.";
          if (r.day !== "tue" && r.day !== "fri") return `${name}: the day is tue or fri.`;
          if (r.starts && !/^\d{4}-\d{2}-\d{2}$/.test(r.starts))
            return `${name}: the start date is YYYY-MM-DD.`;
          out[name] = { day: r.day, ...(r.starts && { starts_on: r.starts }) };
        }
        return [["route.markets", out]];
      }}
    >
      <RowsEditor
        rows={list}
        setRows={setList}
        blank={{ market: "", day: "tue", starts: "" }}
        addLabel="Add a market"
        columns={[
          { key: "market", label: "Market" },
          { key: "day", label: "Day (tue or fri)" },
          { key: "starts", label: "Starts on (YYYY-MM-DD)" },
        ]}
      />
    </Section>
  );
}

type DefaultsMarkets = typeof DEFAULT_SETTINGS.routeMarkets;

function NumbersSection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const num = (k: string, d: number) =>
    typeof rows[k]?.value === "number" ? (rows[k].value as number) : d;
  const handling = (rows["pricing.handling_paise"]?.value as Record<string, number>) ?? {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  };
  const slots = rows["capacity.device_rack_slots"]?.value;
  const [v, setV] = useState({
    factor: String(num("pricing.grade_b_factor", 0.75)),
    fresh: String(num("pricing.reference_fresh_days", 180)),
    slots: typeof slots === "number" ? String(slots) : "",
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
      description="The grade-B factor and the reference-price window are public (they explain the usual price ranges). Handling and the device rack slots are for staff only. Leave the rack slots empty until the hub lead has counted them: no capacity percentage or alert is shown until then. Handling defaults to ₹0; the B repair cost is the actual repair fee."
      onSaved={onSaved}
      save={() => {
        const factor = Number(v.factor),
          fresh = Number(v.fresh);
        if (!(factor > 0 && factor <= 1))
          return "The grade-B factor is between 0 and 1 (e.g. 0.75).";
        if (!(fresh >= 7 && fresh <= 730))
          return "Reference prices stay current for 7 to 730 days.";
        let rackSlots: number | null = null;
        if (v.slots.trim()) {
          rackSlots = Number(v.slots);
          if (!(rackSlots >= 10 && rackSlots <= 5000))
            return "Device rack slots are between 10 and 5,000.";
        }
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
          ["pricing.handling_paise", h],
          ["capacity.device_rack_slots", rackSlots === null ? null : Math.round(rackSlots)],
        ];
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Grade-B price factor" hint="B band = factor × A band (0.75)">
          <Input inputMode="decimal" value={v.factor} onChange={set("factor")} />
        </Field>
        <Field label="Reference prices current for (days)">
          <Input inputMode="numeric" value={v.fresh} onChange={set("fresh")} />
        </Field>
        <Field label="Device rack slots" hint="Empty = not counted yet">
          <Input inputMode="numeric" value={v.slots} onChange={set("slots")} />
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

const STAFF_NUMBERS: [key: string, label: string, hint: string][] = [
  [
    "finance.scrap_spread_paise_per_kg",
    "Scrap spread (₹ per kg)",
    "Plan benchmark. Staff-only; empty = not set.",
  ],
  [
    "finance.device_unit_paise",
    "Per-device figure (₹)",
    "Plan benchmark. Staff-only; empty = not set.",
  ],
  [
    "finance.parts_target_monthly_paise",
    "Used parts sold a month, target (₹)",
    "Used parts shop included. Staff-only.",
  ],
  ["finance.fixed_costs_monthly_paise", "Fixed costs a month (₹)", "Staff-only."],
  ["finance.setup_costs_paise", "Set-up costs (₹)", "Staff-only."],
];
const VRRG_BINS = ["screens", "boards", "other", "d_devices", "batteries"] as const;
const CUTOFFS: [key: string, label: string, hint: string][] = [
  [
    "ownership.required_from",
    "Ownership tick required from",
    "A device bought on or after this date needs the seller's ownership tick. Empty = not enforced yet.",
  ],
  [
    "wipe.strip_required_from",
    "Wipe before stripping required from",
    "Devices received on or after this date are wiped (or their storage destroyed) before they are stripped.",
  ],
  [
    "stock.grace_until",
    "Stock rules start after",
    "Nothing is cut or stripped before this date: the grace for stock already past a threshold.",
  ],
];

/** Staff-only figures: plan benchmarks, VRRG rates and the launch cutoffs. Never public. */
function StaffPlanSection({ rows, onSaved }: { rows: Rows; onSaved: () => void }) {
  const [nums, setNums] = useState<Record<string, string>>(
    Object.fromEntries(
      STAFF_NUMBERS.map(([k]) => [
        k,
        typeof rows[k]?.value === "number" ? rupees(rows[k].value) : "",
      ]),
    ),
  );
  const vr = (rows["vrg.rates_paise"]?.value as Record<string, number> | undefined) ?? {};
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(VRRG_BINS.map((b) => [b, rupees(vr[b])])),
  );
  const [dates, setDates] = useState<Record<string, string>>(
    Object.fromEntries(CUTOFFS.map(([k]) => [k, str(rows, k)])),
  );
  return (
    <Section
      title="Staff-only plan figures and launch dates"
      description="These never appear on the public site or in any public view. They start empty: enter them from the private business plan. VRRG rates are what the licensed recycler pays per kg, by bin."
      onSaved={onSaved}
      save={() => {
        const out: [string, unknown][] = [];
        for (const [k, label] of STAFF_NUMBERS) {
          const t = nums[k].trim();
          if (!t) {
            out.push([k, null]);
            continue;
          }
          const n = Number(t);
          if (!(n >= 0 && n <= 100_000_000)) return `${label}: enter a rupee amount.`;
          out.push([k, toPaise(t)]);
        }
        const r: Record<string, number> = {};
        for (const b of VRRG_BINS) {
          const t = rates[b].trim();
          if (!t) continue;
          const n = Number(t);
          if (!(n >= 0 && n <= 100_000)) return `VRRG rate for ${b}: enter rupees per kg.`;
          r[b] = toPaise(t);
        }
        out.push(["vrg.rates_paise", r]);
        for (const [k, label] of CUTOFFS) {
          const t = dates[k].trim();
          if (t && !/^\d{4}-\d{2}-\d{2}$/.test(t))
            return `${label}: use YYYY-MM-DD, or leave empty.`;
          out.push([k, t || null]);
        }
        return out;
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAFF_NUMBERS.map(([k, label, hint]) => (
          <Field key={k} label={label} hint={hint}>
            <Input
              inputMode="decimal"
              value={nums[k]}
              onChange={(e) => setNums({ ...nums, [k]: e.target.value })}
            />
          </Field>
        ))}
        {VRRG_BINS.map((b) => (
          <Field key={b} label={`VRRG rate: ${b} (₹ per kg)`}>
            <Input
              inputMode="decimal"
              value={rates[b]}
              onChange={(e) => setRates({ ...rates, [b]: e.target.value })}
            />
          </Field>
        ))}
        {CUTOFFS.map(([k, label, hint]) => (
          <Field key={k} label={label} hint={hint}>
            <Input
              value={dates[k]}
              placeholder="YYYY-MM-DD"
              onChange={(e) => setDates({ ...dates, [k]: e.target.value })}
            />
          </Field>
        ))}
      </div>
    </Section>
  );
}
