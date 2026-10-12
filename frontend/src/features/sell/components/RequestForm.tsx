
"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { addSubmission } from "@/features/inventory/store";
import type { Submission } from "@/features/inventory/model";
import { cn } from "@/lib/utils/cn";
import { buildRequestText, isValidPhone } from "../handoff";
import { HandoffPanel } from "./HandoffPanel";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "tel" | "email" | "textarea" | "select" | "date" | "number";
  required?: boolean;
  options?: readonly string[];
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  full?: boolean;
};

type Props = {
  kind: Submission["kind"];
  title: string;
  fields: Field[];
  submitLabel: string;
  initial?: Record<string, string>;
};

export const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink transition placeholder:text-muted hover:border-line-strong focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none aria-[invalid=true]:border-danger sm:text-sm";

export function RequestForm({
  kind,
  title,
  fields,
  submitLabel,
  initial = {},
}: Props) {
  const formId = useId();

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? ""])),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));

    if (errors[name]) {
      setErrors((e) => ({ ...e, [name]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};

    for (const f of fields) {
      const v = values[f.name]?.trim() ?? "";

      if (f.required && !v) {
        next[f.name] = `Please fill in ${f.label.toLowerCase()}.`;
      } else if (v && f.type === "tel" && !isValidPhone(v)) {
        next[f.name] = "Enter a phone number with at least 10 digits.";
      } else if (
        v &&
        f.type === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
      ) {
        next[f.name] = "Enter a valid email address.";
      }
    }

    setErrors(next);

    const firstBad = fields.find((f) => next[f.name]);

    if (firstBad) {
      document.getElementById(`${formId}-${firstBad.name}`)?.focus();
    }

    return !firstBad;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (saving || !validate()) return;

    setSubmitError(null);

    const text = buildRequestText(
      title,
      fields.map((f) => [f.label, values[f.name] ?? ""]),
    );

    if (kind === "institution_pickup") {
      setSaving(true);

      try {
        const institutionName =
          values.institutionName ??
          values.institution_name ??
          values.institution ??
          "";

        const contactName =
          values.contactName ??
          values.contact_name ??
          values.name ??
          "";

        const response = await fetch("/api/institution-submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institutionName,
            contactName,
            phone: values.phone ?? values.mobile ?? "",
            email: values.email ?? "",
            details: values,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ?? "Could not save your request.",
          );
        }

        setSent(text);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Could not submit your request. Please try again.",
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    try {
      await addSubmission(kind, values);
      setSent(text);
    } catch {
      setSubmitError("Could not submit your request. Please try again.");
    }
  };

  if (sent) {
    return (
      <HandoffPanel
        subject={`ReLoop: ${title}`}
        text={sent}
        onReset={() => setSent(null)}
      />
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="grid gap-4 sm:grid-cols-2"
    >
      {fields.map((f) => {
        const id = `${formId}-${f.name}`;
        const err = errors[f.name];

        const common = {
          id,
          name: f.name,
          value: values[f.name] ?? "",
          "aria-invalid": err ? true : undefined,
          "aria-describedby": err
            ? `${id}-err`
            : f.hint
              ? `${id}-hint`
              : undefined,
          className: cn(
            inputClass,
            f.type === "textarea" && "min-h-24 py-3",
          ),
        };

        return (
          <div
            key={f.name}
            className={cn(
              "flex flex-col gap-1.5",
              (f.full || f.type === "textarea") &&
                "sm:col-span-2",
            )}
          >
            <label
              htmlFor={id}
              className="text-sm font-medium text-ink"
            >
              {f.label}
              {f.required && (
                <span className="text-danger"> *</span>
              )}
            </label>

            {f.type === "textarea" ? (
              <textarea
                {...common}
                placeholder={f.placeholder}
                maxLength={800}
                onChange={(e) => set(f.name, e.target.value)}
              />
            ) : f.type === "select" ? (
              <select
                {...common}
                onChange={(e) => set(f.name, e.target.value)}
              >
                <option value="">Choose…</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete}
                maxLength={120}
                inputMode={f.type === "tel" ? "tel" : undefined}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}

            {f.hint && !err && (
              <span
                id={`${id}-hint`}
                className="text-xs text-muted"
              >
                {f.hint}
              </span>
            )}

            {err && (
              <span
                id={`${id}-err`}
                className="text-xs font-medium text-danger"
              >
                {err}
              </span>
            )}
          </div>
        );
      })}

      <div className="sm:col-span-2">
        {submitError && (
          <p role="alert" className="mb-3 text-sm text-danger">
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
