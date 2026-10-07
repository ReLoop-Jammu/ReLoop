"use client";

import { Camera, Printer, X } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { BUSINESS_RULES } from "@/config/business-rules";
import {
  CATEGORIES,
  GRADES,
  PART_TYPES,
  SOURCE_TYPES,
  categoryLabel,
  needsDataWipe,
  type BuyMode,
  type Category,
  type Grade,
  type Item,
  type PartType,
  type SourceType,
} from "@/features/inventory/model";
import { estimateBuyPrice } from "@/features/inventory/pricing";
import { createItem } from "@/features/inventory/store";
import { formatPrice } from "@/lib/utils/money";
import { compressImage } from "../photos";
import { useHubData } from "../useHubData";
import { Field, Input, PageTitle, Panel, Select, hubInput, rupeesToPaiseOrNull } from "./ui";

type Draft = {
  sourceType: SourceType;
  partnerId: string;
  institutionId: string;
  sourceName: string;
  category: Category;
  partType: PartType | "";
  brand: string;
  model: string;
  description: string;
  hasBattery: boolean;
  weightKg: string;
  grade: Grade | "";
  buyMode: BuyMode;
  buy: string;
  resale: string;
  photos: string[];
};

const BLANK: Draft = {
  sourceType: "repair_shop",
  partnerId: "",
  institutionId: "",
  sourceName: "",
  category: "phone",
  partType: "",
  brand: "",
  model: "",
  description: "",
  hasBattery: true,
  weightKg: "",
  grade: "",
  buyMode: "cash",
  buy: "",
  resale: "",
  photos: [],
};

export function IntakeForm() {
  const id = useId();
  const { partners, institutions } = useHubData();
  const [d, setD] = useState<Draft>(BLANK);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Item | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const resalePaise = rupeesToPaiseOrNull(d.resale);
  const suggestion = d.grade ? estimateBuyPrice(d.grade, resalePaise) : null;
  const consignable =
    resalePaise !== null && resalePaise > BUSINESS_RULES.consignment.thresholdPaise;

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    try {
      const next = await Promise.all(
        [...files].slice(0, 4 - d.photos.length).map((f) => compressImage(f)),
      );
      set("photos", [...d.photos, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that photo.");
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!d.brand.trim() && !d.model.trim()) return setError("Enter at least a brand or a model.");
    if (d.category === "part" && !d.partType) return setError("Choose the part type.");
    if (d.sourceType === "repair_shop" || d.sourceType === "retailer") {
      if (!d.partnerId && !d.sourceName.trim())
        return setError("Choose the partner shop, or type the shop name.");
    }
    const buyPaise = d.buyMode === "free" ? 0 : rupeesToPaiseOrNull(d.buy);
    if (buyPaise === null) return setError("Enter what we paid (0 if nothing).");
    const partner = partners.find((p) => p.id === d.partnerId);
    const inst = institutions.find((i) => i.id === d.institutionId);
    try {
      const item = await createItem({
        receivedAt: new Date().toISOString(),
        source: {
          type: d.sourceType,
          ...(partner && { partnerId: partner.id, name: partner.name }),
          ...(inst && { institutionId: inst.id, name: inst.name }),
          ...(!partner && !inst && d.sourceName.trim() && { name: d.sourceName.trim() }),
        },
        category: d.category,
        ...(d.category === "part" && d.partType && { partType: d.partType }),
        brand: d.brand.trim(),
        model: d.model.trim(),
        description: d.description.trim(),
        photos: d.photos,
        hasBattery: d.hasBattery,
        ...(d.weightKg && { weightKg: Number(d.weightKg) }),
        ...(d.grade && { grade: d.grade }),
        faults: "",
        dataWipe: {
          required: needsDataWipe({ category: d.category, partType: d.partType || undefined }),
        },
        rack: "",
        buyMode: d.buyMode,
        buyPaise,
        expectedResalePaise: resalePaise,
      });
      setSaved(item);
      setD({
        ...BLANK,
        sourceType: d.sourceType,
        partnerId: d.partnerId,
        institutionId: d.institutionId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  return (
    <>
      <PageTitle
        title="Intake"
        description="Log each item as it arrives. It gets the next RL-JMU tag automatically."
      />

      {saved && (
        <Panel className="mb-6 border-grade-a/40 bg-grade-a-bg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="print-tag rounded-xl border-2 border-dashed border-ink bg-white px-6 py-4">
              <p className="font-mono text-3xl font-bold tracking-wider">{saved.id}</p>
              <p className="mt-1 text-sm">
                {categoryLabel(saved.category)} ·{" "}
                {[saved.brand, saved.model].filter(Boolean).join(" ")}
              </p>
              <p className="text-xs text-muted">
                In {new Date(saved.receivedAt).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden="true" /> Print tag
              </Button>
              <Link href={`/hub/items/${saved.id}`} className={buttonClasses({ size: "sm" })}>
                {saved.grade ? "Open item" : "Grade it now"}
              </Link>
            </div>
          </div>
        </Panel>
      )}

      <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-2">
        <Panel title="Where it came from">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source" htmlFor={`${id}-src`}>
              <Select
                id={`${id}-src`}
                value={d.sourceType}
                onChange={(e) =>
                  setD((x) => ({
                    ...x,
                    sourceType: e.target.value as SourceType,
                    partnerId: "",
                    institutionId: "",
                  }))
                }
              >
                {SOURCE_TYPES.filter((s) => s.value !== "stripped").map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            {(d.sourceType === "repair_shop" || d.sourceType === "retailer") && (
              <Field
                label="Partner shop"
                htmlFor={`${id}-partner`}
                hint={partners.length ? undefined : "Add shops under Shops & institutions."}
              >
                <Select
                  id={`${id}-partner`}
                  value={d.partnerId}
                  onChange={(e) => set("partnerId", e.target.value)}
                >
                  <option value="">Not listed: type below</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.market})
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {d.sourceType === "institution" && (
              <Field label="Institution" htmlFor={`${id}-inst`}>
                <Select
                  id={`${id}-inst`}
                  value={d.institutionId}
                  onChange={(e) => set("institutionId", e.target.value)}
                >
                  <option value="">Not listed: type below</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {!d.partnerId && !d.institutionId && (
              <Field
                label={d.sourceType === "household" ? "Seller name (optional)" : "Name"}
                htmlFor={`${id}-sname`}
                className="sm:col-span-2"
              >
                <Input
                  id={`${id}-sname`}
                  value={d.sourceName}
                  onChange={(e) => set("sourceName", e.target.value)}
                  maxLength={80}
                />
              </Field>
            )}
          </div>
        </Panel>

        <Panel title="What it is">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor={`${id}-cat`}>
              <Select
                id={`${id}-cat`}
                value={d.category}
                onChange={(e) => set("category", e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.single}
                  </option>
                ))}
              </Select>
            </Field>
            {d.category === "part" ? (
              <Field label="Part type" htmlFor={`${id}-pt`}>
                <Select
                  id={`${id}-pt`}
                  value={d.partType}
                  onChange={(e) => set("partType", e.target.value as PartType)}
                >
                  <option value="">Choose…</option>
                  {PART_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <div />
            )}
            <Field label="Brand" htmlFor={`${id}-brand`}>
              <Input
                id={`${id}-brand`}
                value={d.brand}
                onChange={(e) => set("brand", e.target.value)}
                maxLength={40}
                placeholder="e.g. Samsung"
              />
            </Field>
            <Field label="Model" htmlFor={`${id}-model`}>
              <Input
                id={`${id}-model`}
                value={d.model}
                onChange={(e) => set("model", e.target.value)}
                maxLength={60}
                placeholder="e.g. Galaxy M31"
              />
            </Field>
            <Field label="Notes" htmlFor={`${id}-desc`} className="sm:col-span-2">
              <textarea
                id={`${id}-desc`}
                value={d.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={600}
                className={`${hubInput} min-h-20 py-2`}
                placeholder="Specs, visible damage, accessories included"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-1">
              <input
                type="checkbox"
                checked={d.hasBattery}
                onChange={(e) => set("hasBattery", e.target.checked)}
                className="size-4"
              />
              Contains a battery
            </label>
            <Field label="Weight (kg, optional)" htmlFor={`${id}-kg`}>
              <Input
                id={`${id}-kg`}
                type="number"
                min="0"
                step="0.1"
                value={d.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Grade and price">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Grade (if tested now)"
              htmlFor={`${id}-grade`}
              hint="Leave blank to grade later (within 24 h)."
            >
              <Select
                id={`${id}-grade`}
                value={d.grade}
                onChange={(e) => set("grade", e.target.value as Grade | "")}
              >
                <option value="">Not graded yet</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Expected resale (₹)"
              htmlFor={`${id}-resale`}
              hint="What it should sell for once listed."
            >
              <Input
                id={`${id}-resale`}
                inputMode="decimal"
                value={d.resale}
                onChange={(e) => set("resale", e.target.value)}
              />
            </Field>
            <Field label="How we bought it" htmlFor={`${id}-mode`}>
              <Select
                id={`${id}-mode`}
                value={d.buyMode}
                onChange={(e) => set("buyMode", e.target.value as BuyMode)}
              >
                <option value="cash">Cash on pickup</option>
                <option value="consignment">Consignment (seller gets 70% on sale)</option>
                <option value="free">Free (scrap / disposal)</option>
              </Select>
            </Field>
            <Field label="We paid (₹)" htmlFor={`${id}-buy`}>
              <Input
                id={`${id}-buy`}
                inputMode="decimal"
                value={d.buyMode === "free" ? "0" : d.buy}
                disabled={d.buyMode === "free"}
                onChange={(e) => set("buy", e.target.value)}
              />
            </Field>
          </div>
          {suggestion && (
            <p className="mt-4 rounded-lg bg-sunken p-3 text-sm text-ink-soft">
              Price list for grade {suggestion.grade}:{" "}
              <strong className="text-ink">
                {suggestion.kind === "range"
                  ? `${formatPrice(suggestion.minPaise)} – ${formatPrice(suggestion.maxPaise)}`
                  : suggestion.kind === "free_disposal"
                    ? "free pickup, pay nothing"
                    : "enter the expected resale to see a price"}
              </strong>
              {consignable &&
                d.buyMode !== "consignment" &&
                " · Worth more than ₹10,000: offer consignment."}
            </p>
          )}
        </Panel>

        <Panel title="Photos">
          <div className="flex flex-wrap gap-3">
            {d.photos.map((p, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                <img
                  src={p}
                  alt={`Photo ${i + 1}`}
                  className="size-24 rounded-lg border border-line object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() =>
                    set(
                      "photos",
                      d.photos.filter((_, j) => j !== i),
                    )
                  }
                  className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {d.photos.length < 4 && (
              <label className="grid size-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line-strong text-muted transition hover:border-brand-500 hover:text-brand-600">
                <span className="flex flex-col items-center gap-1 text-xs">
                  <Camera className="size-5" aria-hidden="true" /> Add photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="sr-only"
                  onChange={(e) => void addPhotos(e.target.files)}
                />
              </label>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Up to 4 photos, shrunk automatically to save space.
          </p>
        </Panel>

        <div className="flex flex-wrap items-center gap-4 xl:col-span-2">
          <Button type="submit" size="lg">
            Save and assign tag
          </Button>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      </form>
    </>
  );
}
