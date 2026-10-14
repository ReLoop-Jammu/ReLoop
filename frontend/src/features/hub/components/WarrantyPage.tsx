"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { BUSINESS_RULES } from "@/config/business-rules";
import { SHARED_DATABASE } from "@/features/inventory/store";
import {
  CLAIM_LABEL,
  decideClaim,
  isClosedClaim,
  listClaims,
  logClaim,
  type ClaimStep,
  type HubClaim,
} from "@/features/warranty/api";
import { refreshHubBadges } from "../badges";
import { hubInput, PageTitle, Panel } from "./ui";

const NEXT: Record<string, { step: ClaimStep; label: string; needsWords?: boolean }[]> = {
  open: [
    { step: "approved", label: "Accept" },
    { step: "rejected", label: "Reject", needsWords: true },
  ],
  approved: [
    { step: "repairing", label: "Repairing" },
    { step: "replaced", label: "Replaced", needsWords: true },
    { step: "refunded", label: "Refunded", needsWords: true },
    { step: "rejected", label: "Reject", needsWords: true },
  ],
  repairing: [
    { step: "closed", label: "Repaired: close" },
    { step: "replaced", label: "Replaced instead", needsWords: true },
    { step: "refunded", label: "Refunded instead", needsWords: true },
  ],
};

export function WarrantyPage() {
  return (
    <>
      <PageTitle
        title="Warranty claims"
        description={`Grade A and B devices have a ${BUSINESS_RULES.warrantyDays}-day warranty from the sale, for faults present at sale (not physical or liquid damage, misuse or third-party repairs). ReLoop chooses the remedy: repair first, then replacement, then refund. Closed claims are deleted 12 months after closing.`}
      />
      {SHARED_DATABASE ? (
        <Claims />
      ) : (
        <p className="text-sm text-muted">Warranty claims are kept in the shared database.</p>
      )}
    </>
  );
}

function Claims() {
  const [rows, setRows] = useState<HubClaim[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    listClaims()
      .then((r) => {
        setRows(r);
        setError("");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load claims."));
    void refreshHubBadges();
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const open = rows?.filter((r) => !isClosedClaim(r.status)) ?? [];
  const closed = rows?.filter((r) => isClosedClaim(r.status)) ?? [];
  return (
    <div className="grid gap-6">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Panel title={rows ? `Open (${open.length})` : "Open"}>
        {!rows ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : open.length === 0 ? (
          <p className="text-sm text-muted">No open claims.</p>
        ) : (
          <ul className="divide-y divide-line">
            {open.map((c) => (
              <ClaimRow key={c.id} claim={c} onChanged={load} />
            ))}
          </ul>
        )}
      </Panel>
      <LogClaim onDone={load} />
      {closed.length > 0 && (
        <Panel title={`Closed (${closed.length})`}>
          <ul className="divide-y divide-line">
            {closed.map((c) => (
              <ClaimRow key={c.id} claim={c} onChanged={load} />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function ClaimRow({ claim: c, onChanged }: { claim: HubClaim; onChanged: () => void }) {
  const [resolution, setResolution] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function step(s: ClaimStep) {
    setBusy(true);
    setError("");
    try {
      await decideClaim(c.id, s, resolution, note);
      setResolution("");
      setNote("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }
  const actions = NEXT[c.status] ?? [];
  return (
    <li className="py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          <Link className="font-mono text-brand-600 underline" href={`/hub/items/${c.item_id}`}>
            {c.item_id}
          </Link>{" "}
          · {CLAIM_LABEL[c.status] ?? c.status}
        </h3>
        <span className="text-xs text-muted">
          {new Date(c.created_at).toLocaleDateString("en-IN")} ·{" "}
          {c.opened_by === "buyer"
            ? c.buyer_id
              ? "from the buyer's account"
              : "from a deleted account"
            : `logged by staff${c.contact_name ? ` for ${c.contact_name}, ${c.contact_phone}` : ""}`}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-ink-soft">{c.fault}</p>
      {c.resolution && <p className="mt-1">Told the buyer: “{c.resolution}”</p>}
      {c.staff_note && <p className="mt-1 text-muted">Staff note: {c.staff_note}</p>}
      {actions.length > 0 && (
        <div className="mt-3 grid gap-2">
          <div className="flex flex-wrap gap-2">
            <label className="grid min-w-64 flex-1 gap-1 text-xs font-medium">
              What to tell the buyer (needed to reject, replace or refund)
              <input
                className={hubInput}
                value={resolution}
                maxLength={500}
                onChange={(e) => setResolution(e.target.value)}
              />
            </label>
            <label className="grid min-w-48 flex-1 gap-1 text-xs font-medium">
              Staff note (staff only)
              <input
                className={hubInput}
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button
                key={a.step}
                size="sm"
                variant={a.step === "rejected" ? "secondary" : "primary"}
                disabled={busy}
                onClick={() => void step(a.step)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

function LogClaim({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState({ item: "", name: "", phone: "", fault: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone("");
    logClaim(v.item.trim().toUpperCase(), v.name, v.phone, v.fault)
      .then(() => {
        setDone(`Claim logged for ${v.item.trim().toUpperCase()}.`);
        setV({ item: "", name: "", phone: "", fault: "" });
        onDone();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't work."))
      .finally(() => setBusy(false));
  }
  return (
    <Panel title="Log a claim for a walk-in sale">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit} noValidate>
        <label className="grid gap-1 text-xs font-medium">
          Item tag
          <input
            className={`${hubInput} font-mono`}
            placeholder="RL-JMU-0042"
            value={v.item}
            onChange={(e) => setV({ ...v, item: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Buyer&apos;s name
          <input
            className={hubInput}
            value={v.name}
            maxLength={80}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Buyer&apos;s phone
          <input
            className={hubInput}
            type="tel"
            value={v.phone}
            maxLength={20}
            onChange={(e) => setV({ ...v, phone: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium sm:col-span-2">
          What went wrong
          <textarea
            className={`${hubInput} min-h-20 py-2`}
            value={v.fault}
            maxLength={1000}
            onChange={(e) => setV({ ...v, fault: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button size="sm" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Log the claim"}
          </Button>
          {done && (
            <p role="status" className="text-sm text-success">
              {done}
            </p>
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
