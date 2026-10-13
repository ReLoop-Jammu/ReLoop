
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
  const [website, setWebsite] = useState("");

  const set = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));

    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};

    for (const field of fields) {
      const value = values[field.name]?.trim() ?? "";

      if (field.required && !value) {
        next[field.name] =
          `Please fill in ${field.label.toLowerCase()}.`;
      } else if (
        value &&
        field.type === "tel" &&
        !isValidPhone(value)
      ) {
        next[field.name] =
          "Enter a phone number with at least 10 digits.";
      } else if (
        value &&
        field.type === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
      ) {
        next[field.name] = "Enter a valid email address.";
      }
    }

    setErrors(next);

    const firstInvalid = fields.find(
      (field) => next[field.name],
    );

    if (firstInvalid) {
      document
        .getElementById(`${formId}-${firstInvalid.name}`)
        ?.focus();
    }

    return !firstInvalid;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (saving || !validate()) return;

    setSubmitError(null);

    const requestText = buildRequestText(
      title,
      fields.map((field) => [
        field.label,
        values[field.name] ?? "",
      ]),
    );

    if (kind === "institution_pickup") {
      setSaving(true);

      try {
        const response = await fetch(
          "/api/institution-submissions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              institutionName: values.institution ?? "",
              contactName: values.contact ?? "",
              phone: values.phone ?? "",
              email: values.email ?? "",
              details: {
                type: values.type ?? "",
                preferredDate: values.date ?? "",
                lotDescription: values.items ?? "",
              },
              website,
            }),
          },
        );

        const result = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(
            result.error ??
              "We couldn't save your booking. Please try again.",
          );
        }

        setSent(requestText);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "A connection error occurred. Please try again.",
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    try {
      await addSubmission(kind, values);
      setSent(requestText);
    } catch {
      setSubmitError(
        "Could not submit your request. Please try again.",
      );
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
      {fields.map((field) => {
        const id = `${formId}-${field.name}`;
        const error = errors[field.name];

        const common = {
          id,
          name: field.name,
          value: values[field.name] ?? "",
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error
            ? `${id}-err`
            : field.hint
              ? `${id}-hint`
              : undefined,
          className: cn(
            inputClass,
            field.type === "textarea" && "min-h-24 py-3",
          ),
        };

        return (
          <div
            key={field.name}
            className={cn(
              "flex flex-col gap-1.5",
              (field.full || field.type === "textarea") &&
                "sm:col-span-2",
            )}
          >
            <label
              htmlFor={id}
              className="text-sm font-medium text-ink"
            >
              {field.label}
              {field.required && (
                <span className="text-danger"> *</span>
              )}
            </label>

            {field.type === "textarea" ? (
              <textarea
                {...common}
                placeholder={field.placeholder}
                maxLength={800}
                onChange={(event) =>
                  set(field.name, event.target.value)
                }
              />
            ) : field.type === "select" ? (
              <select
                {...common}
                onChange={(event) =>
                  set(field.name, event.target.value)
                }
              >
                <option value="">Choose…</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                maxLength={field.type === "email" ? 254 : 120}
                inputMode={
                  field.type === "tel" ? "tel" : undefined
                }
                onChange={(event) =>
                  set(field.name, event.target.value)
                }
              />
            )}

            {field.hint && !error && (
              <span
                id={`${id}-hint`}
                className="text-xs text-muted"
              >
                {field.hint}
              </span>
            )}

            {error && (
              <span
                id={`${id}-err`}
                className="text-xs font-medium text-danger"
              >
                {error}
              </span>
            )}
          </div>
        );
      })}

      <div className="sm:col-span-2">
        {submitError && (
          <p
            role="alert"
            className="mb-3 text-sm text-danger"
          >
            {submitError}
          </p>
        )}

        <div className="hidden" aria-hidden="true">
          <label htmlFor={`${formId}-website`}>Website</label>
          <input
            id={`${formId}-website`}
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
