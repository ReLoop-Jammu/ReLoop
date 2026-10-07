"use client";

import { ArrowRight, Calculator, Recycle } from "lucide-react";
import { useId, useState } from "react";
import { BUSINESS_RULES } from "@/config/business-rules";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { CATEGORIES, GRADE_INFO } from "@/features/inventory/model";
import { estimateBuyPrice, likelyGrade, type ConditionAnswers } from "@/features/inventory/pricing";
import { formatPrice, rupeesToPaise } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { inputClass } from "./RequestForm";

type Choice<T extends string> = { value: T; label: string };

function Choices<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Choice<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm transition has-focus-visible:ring-2 has-focus-visible:ring-brand-500",
              value === o.value
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-ink-soft hover:border-line-strong",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type EstimateResult = { category: string; model: string; summary: string };

/**
 * Indicative buy price from the plan's rules: A ≈45% and B ≈25% of expected
 * resale, C ₹100–200, D free disposal. The final price is set after testing.
 */
export function BuyEstimator({ onBook }: { onBook?: (r: EstimateResult) => void }) {
  const id = useId();
  const [category, setCategory] = useState("phone");
  const [model, setModel] = useState("");
  const [answers, setAnswers] = useState<ConditionAnswers>({
    powersOn: "yes",
    allWorking: "yes",
    hazard: false,
  });
  const [resale, setResale] = useState("");

  const grade = likelyGrade(answers);
  const resaleRupees = Number(resale.replace(/[^\d]/g, ""));
  const estimate = estimateBuyPrice(grade, resaleRupees > 0 ? rupeesToPaise(resaleRupees) : null);
  const catLabel = CATEGORIES.find((c) => c.value === category)?.single ?? category;

  let summary: string;
  if (estimate.kind === "free_disposal")
    summary = "Free, safe disposal through an authorised recycler";
  else if (estimate.kind === "rule_only")
    summary = `About ${Math.round(BUSINESS_RULES.buy[estimate.grade as "A" | "B"].shareOfResale * 100)}% of its resale value`;
  else summary = `${formatPrice(estimate.minPaise)} – ${formatPrice(estimate.maxPaise)}`;

  return (
    <div className="grid gap-6 rounded-panel border border-line bg-surface p-5 shadow-soft sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label
            className="flex flex-col gap-1.5 text-sm font-medium text-ink"
            htmlFor={`${id}-cat`}
          >
            What is it?
            <select
              id={`${id}-cat`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {CATEGORIES.filter((c) => c.value !== "part").map((c) => (
                <option key={c.value} value={c.value}>
                  {c.single}
                </option>
              ))}
            </select>
          </label>
          <label
            className="flex flex-col gap-1.5 text-sm font-medium text-ink"
            htmlFor={`${id}-model`}
          >
            Brand and model
            <input
              id={`${id}-model`}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Redmi Note 10"
              maxLength={80}
              className={inputClass}
            />
          </label>
        </div>
        <Choices
          legend="Does it switch on?"
          name={`${id}-power`}
          value={answers.powersOn}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unsure", label: "Not sure" },
          ]}
          onChange={(v) => setAnswers((a) => ({ ...a, powersOn: v }))}
        />
        <Choices
          legend="Does everything work: screen, battery, buttons, ports?"
          name={`${id}-work`}
          value={answers.allWorking}
          options={[
            { value: "yes", label: "Everything works" },
            { value: "one_fault", label: "One problem" },
            { value: "several_faults", label: "Several problems" },
            { value: "unsure", label: "Not sure" },
          ]}
          onChange={(v) => setAnswers((a) => ({ ...a, allWorking: v }))}
        />
        <Choices
          legend="Any swollen battery, water damage or a broken body?"
          name={`${id}-hazard`}
          value={answers.hazard ? "yes" : "no"}
          options={[
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
          ]}
          onChange={(v) => setAnswers((a) => ({ ...a, hazard: v === "yes" }))}
        />
        {(grade === "A" || grade === "B") && (
          <label
            className="flex flex-col gap-1.5 text-sm font-medium text-ink"
            htmlFor={`${id}-resale`}
          >
            Roughly what do working used ones sell for? (optional)
            <div className="relative">
              <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">₹</span>
              <input
                id={`${id}-resale`}
                inputMode="numeric"
                value={resale}
                onChange={(e) => setResale(e.target.value)}
                placeholder="e.g. 8000"
                maxLength={9}
                className={cn(inputClass, "pl-8")}
              />
            </div>
            <span className="text-xs font-normal text-muted">
              Check a few second-hand listings for the same model. We use it to work out an
              estimate.
            </span>
          </label>
        )}
      </div>

      <div className="flex flex-col rounded-card bg-brand-950 p-6 text-white" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-white/70">
          <Calculator className="size-4" aria-hidden="true" /> Your estimate
        </p>
        <div className="mt-4">
          <GradeBadge grade={grade} />
        </div>
        <p className="mt-2 text-sm text-white/70">
          Likely: {GRADE_INFO[grade].outcome.toLowerCase()}
        </p>
        <p className="mt-5 font-display text-3xl font-bold text-white">{summary}</p>
        {estimate.kind === "range" && estimate.consignmentEligible && estimate.consignmentPaise && (
          <p className="mt-3 rounded-xl bg-white/10 p-3 text-sm leading-relaxed text-white/85">
            Worth more than {formatPrice(BUSINESS_RULES.consignment.thresholdPaise)}? You can also
            sell on <strong className="text-gold-400">consignment</strong> and receive{" "}
            {Math.round(BUSINESS_RULES.consignment.sellerShare * 100)}% (about{" "}
            {formatPrice(estimate.consignmentPaise)}) when it sells.
          </p>
        )}
        {grade === "D" && (
          <p className="mt-3 flex gap-2 text-sm text-white/80">
            <Recycle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> We take it for free so
            it doesn&apos;t end up in ordinary waste.
          </p>
        )}
        <p className="mt-auto pt-6 text-xs leading-relaxed text-white/60">
          Indicative only. The final price is set after we test the item at the hub, and you&apos;re
          free to say no.
        </p>
        {onBook && (
          <button
            type="button"
            onClick={() =>
              onBook({ category: catLabel, model, summary: `Grade ${grade} (likely): ${summary}` })
            }
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold-500 px-5 text-sm font-semibold text-brand-950 transition hover:bg-gold-400"
          >
            Book a drop-off
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
