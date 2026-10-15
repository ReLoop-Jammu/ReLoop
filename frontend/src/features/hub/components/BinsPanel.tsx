"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { BUSINESS_RULES } from "@/config/business-rules";
import {
  BIN_LABEL,
  binStatus,
  recordBinHandover,
  type Bin,
  type BinStatus,
} from "@/features/scrap/api";
import { cn } from "@/lib/utils/cn";
import { Field, Input, Panel } from "./ui";

/** The five bins (screens, boards, other, D devices, battery cabinet) and their handovers to VRRG Group. */
export function BinsPanel({ onChanged }: { onChanged?: () => void }) {
  const [bins, setBins] = useState<BinStatus[] | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Set<Bin>>(new Set());
  const [receipt, setReceipt] = useState("");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const load = useCallback(
    () =>
      binStatus()
        .then(setBins)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "The bins didn't load.")),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (b: Bin) => {
    const next = new Set(picked);
    if (next.has(b)) next.delete(b);
    else next.add(b);
    setPicked(next);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (picked.size === 0) return setError("Choose at least one bin to hand over.");
    if (!receipt.trim()) return setError("Enter VRRG Group's weight receipt number.");
    setState("saving");
    try {
      await recordBinHandover([...picked], receipt.trim(), notes);
      setPicked(new Set());
      setReceipt("");
      setNotes("");
      setState("saved");
      await load();
      onChanged?.();
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "That handover wasn't saved.");
    }
  }

  const { handoverKg, alertKg, handoverDays, batteryHandoverDays } = BUSINESS_RULES.bins;
  return (
    <Panel title="Bins at the hub">
      <p className="text-sm text-muted">
        A bin goes to VRRG Group, Gangyal, at {handoverKg} kg or {handoverDays} days, whichever
        comes first (alert at {alertKg} kg). The battery cabinet goes every week, whatever the
        weight ({batteryHandoverDays} days at most). Every handover needs the partner&apos;s weight
        receipt number.
      </p>
      {error && (
        <Notice tone="danger" role="alert" className="mt-3">
          {error}
        </Notice>
      )}
      {!bins ? (
        <p className="mt-4 text-sm text-muted">Loading the bins…</p>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-4" noValidate>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {bins.map((b) => (
              <li
                key={b.bin}
                className={cn(
                  "rounded-card border p-3 text-sm",
                  b.due
                    ? "border-grade-d bg-grade-d-bg"
                    : b.near_limit
                      ? "border-grade-c bg-grade-c-bg"
                      : "border-line bg-surface",
                )}
              >
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={picked.has(b.bin)}
                    disabled={b.kg <= 0}
                    onChange={() => toggle(b.bin)}
                  />
                  <span>
                    <span className="block font-semibold">{BIN_LABEL[b.bin]}</span>
                    <span className="block text-2xl font-bold tabular-nums">
                      {b.kg.toFixed(1)} kg
                    </span>
                    <span className="block text-xs text-muted">
                      {b.kg > 0 ? `waiting ${b.days_waiting} days` : "empty"}
                    </span>
                    {b.due && <span className="block text-xs font-semibold">Hand over now</span>}
                    {!b.due && b.near_limit && (
                      <span className="block text-xs font-semibold">Near {handoverKg} kg</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="VRRG Group weight receipt number">
              <Input value={receipt} onChange={(e) => setReceipt(e.target.value)} maxLength={60} />
            </Field>
            <Field label="Note (optional)">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={state === "saving"}>
              {state === "saving" ? "Saving…" : `Hand over ${picked.size || ""} bin(s)`}
            </Button>
            {state === "saved" && (
              <span role="status" className="text-sm text-success">
                Handover recorded.
              </span>
            )}
          </div>
        </form>
      )}
    </Panel>
  );
}
