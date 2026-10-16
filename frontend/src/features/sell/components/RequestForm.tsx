"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { addSubmission } from "@/features/inventory/store";
import type { Submission } from "@/features/inventory/model";
import { cn } from "@/lib/utils/cn";
import { buildRequestText, isValidPhone } from "../handoff";
import { controlClasses } from "@/components/ui/controls";
import { IS_SIMULATION } from "@/lib/environment";
import { SimulationFormNote } from "@/components/layout/SimulationFormNote";
import { HandoffPanel } from "./HandoffPanel";
import { RequestReceived } from "./RequestReceived";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "tel" | "email" | "textarea" | "select" | "date" | "number";
  required?: boolean;
  options?: readonly string[];
  placeholder?: string;
  /** Earliest date, for date fields (YYYY-MM-DD). */
  min?: string;
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
  /** The item a reservation or enquiry is about. */
  itemId?: string;
};

/** The shared control style (components/ui/controls.ts), kept under its old name for the forms that import it. */
export const inputClass = controlClasses();

/** Generic request form with inline validation. A saved request is a hub ticket; WhatsApp/email are extras. */
export function RequestForm({ kind, title, fields, submitLabel, initial = {}, itemId }: Props) {
  const formId = useId();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? ""])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const [ticket, setTicket] = useState<string | null>(null);
  const [tracking, setTracking] = useState<{ token: string | null; linked: boolean }>({
    token: null,
    linked: false,
  });

  const set = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.name]?.trim() ?? "";
      if (f.required && !v) next[f.name] = `Please fill in ${f.label.toLowerCase()}.`;
      else if (v && f.type === "tel" && !isValidPhone(v))
        next[f.name] = "Enter a phone number with at least 10 digits.";
      else if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
        next[f.name] = "Enter a valid email address.";
    }
    setErrors(next);
    const firstBad = fields.find((f) => next[f.name]);
    if (firstBad) document.getElementById(`${formId}-${firstBad.name}`)?.focus();
    return !firstBad;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const text = buildRequestText(
      title,
      fields.map((f) => [f.label, values[f.name] ?? ""]),
    );
    const result = await addSubmission(kind, values, itemId);
    setSaved(result.saved);
    setTicket(result.ticket);
    setTracking({ token: result.statusToken, linked: result.linked });
    setSent(text);
  };

  if (sent)
    return (
      <>
        {!saved && (
          <p role="status" className="mb-3 text-sm text-muted">
            {IS_SIMULATION
              ? "This demo couldn't save your request. Nothing was sent."
              : "We couldn't keep a copy of this request, so please send it to us below."}
          </p>
        )}
        {saved && (
          <RequestReceived
            kind={kind}
            ticket={ticket}
            phone={values.phone ?? ""}
            tracking={tracking}
          />
        )}
        <HandoffPanel
          subject={ticket ? `ReLoop: ${title} (${ticket})` : `ReLoop: ${title}`}
          text={ticket ? `${sent}\nTicket: ${ticket}` : sent}
          saved={saved}
          onReset={saved ? undefined : () => setSent(null)}
        />
      </>
    );

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <SimulationFormNote className="sm:col-span-2" />
      {fields.map((f) => {
        const id = `${formId}-${f.name}`;
        const err = errors[f.name];
        const common = {
          id,
          name: f.name,
          value: values[f.name],
          "aria-invalid": err ? true : undefined,
          "aria-describedby": err ? `${id}-err` : f.hint ? `${id}-hint` : undefined,
          className: cn(inputClass, f.type === "textarea" && "min-h-24 py-3"),
        };
        return (
          <div
            key={f.name}
            className={cn(
              "flex flex-col gap-1.5",
              (f.full || f.type === "textarea") && "sm:col-span-2",
            )}
          >
            <label htmlFor={id} className="text-sm font-medium text-ink">
              {f.label}
              {f.required && <span className="text-danger"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                {...common}
                placeholder={f.placeholder}
                maxLength={800}
                onChange={(e) => set(f.name, e.target.value)}
              />
            ) : f.type === "select" ? (
              <select {...common} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">Choose…</option>
                {f.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                min={f.min}
                autoComplete={f.autoComplete}
                maxLength={120}
                inputMode={f.type === "tel" ? "tel" : undefined}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
            {f.hint && !err && (
              <span id={`${id}-hint`} className="text-xs text-muted">
                {f.hint}
              </span>
            )}
            {err && (
              <span id={`${id}-err`} className="text-xs font-medium text-danger">
                {err}
              </span>
            )}
          </div>
        );
      })}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
