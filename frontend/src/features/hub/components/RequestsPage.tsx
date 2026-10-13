"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Submission } from "@/features/inventory/model";
import { SHARED_DATABASE, setItemStatus } from "@/features/inventory/store";
import { listRequests, setRequestStatus, type HubRequest } from "../loop";
import { reportHubError } from "../useHubData";
import { hubInput, PageTitle, Panel } from "./ui";

const KINDS: { value: Submission["kind"]; label: string }[] = [
  { value: "reservation", label: "Reservations" },
  { value: "enquiry", label: "Questions" },
  { value: "institution_pickup", label: "Institution pickups" },
];
const STATUSES: Submission["status"][] = ["new", "contacted", "sold", "cancelled", "done"];

const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

export function RequestsPage() {
  const [rows, setRows] = useState<HubRequest[] | null>(null);
  const [kind, setKind] = useState<Submission["kind"] | "all">("all");
  const [status, setStatus] = useState<Submission["status"] | "open">("open");
  const load = useCallback(() => {
    listRequests().then(setRows).catch(reportHubError);
  }, []);
  useEffect(() => {
    if (SHARED_DATABASE) load();
  }, [load]);

  const shown = (rows ?? []).filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      (status === "open" ? r.status === "new" || r.status === "contacted" : r.status === status),
  );

  return (
    <>
      <PageTitle
        title="Requests"
        description="Reservations, questions about items and institution pickup bookings from the public site. Contact people by WhatsApp, then update the status. Closed requests (sold, cancelled or done) are deleted automatically 12 months after closing."
      />
      {!SHARED_DATABASE ? (
        <p className="text-sm text-muted">Requests are kept in the shared database.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <label className="grid gap-1 text-xs font-medium">
              Kind
              <select
                className={hubInput}
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="all">All</option>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Status
              <select
                className={hubInput}
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="open">Open (new or contacted)</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Panel
            title={rows ? `${shown.length} request${shown.length === 1 ? "" : "s"}` : "Requests"}
          >
            {!rows ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : shown.length === 0 ? (
              <p className="text-sm text-muted">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {shown.map((r) => (
                  <RequestRow key={r.id} row={r} onChanged={load} />
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

function RequestRow({ row, onChanged }: { row: HubRequest; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = row.fields.name ?? row.fields.contact ?? "";
  const phone = row.fields.phone ?? "";
  const label = KINDS.find((k) => k.value === row.kind)?.label ?? row.kind;

  const act = async (fn: () => Promise<unknown>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  const details = Object.entries(row.fields).filter(
    ([k]) => !["name", "contact", "phone", "item"].includes(k),
  );

  return (
    <li className="py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {label.replace(/s$/, "")} · {name || "No name"}
          {row.item_id && (
            <>
              {" "}
              ·{" "}
              <Link className="text-brand-600 underline" href={`/hub/items/${row.item_id}`}>
                {row.item_id}
              </Link>
            </>
          )}
        </h3>
        <span className="text-xs text-muted">
          {new Date(row.created_at).toLocaleString("en-IN")} · <strong>{row.status}</strong>
        </span>
      </div>
      {phone && (
        <p className="mt-1">
          {phone} ·{" "}
          <a className="font-semibold text-brand-600 underline" href={waLink(phone)}>
            WhatsApp
          </a>
        </p>
      )}
      {details.length > 0 && (
        <dl className="mt-1 grid gap-x-4 text-ink-soft sm:grid-cols-[max-content_1fr]">
          {details.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="whitespace-pre-line">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {row.status === "new" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void act(() => setRequestStatus(row.id, "contacted"))}
          >
            Mark contacted
          </Button>
        )}
        {row.kind === "reservation" && row.item_id && row.status !== "sold" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void act(() => setItemStatus(row.item_id!, "reserved", `Reserved for ${name}`))
            }
          >
            Mark item reserved
          </Button>
        )}
        {row.item_id && row.status !== "sold" && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await setItemStatus(row.item_id!, "sold", `Sold to ${name}`);
                await setRequestStatus(row.id, "sold");
              })
            }
          >
            Mark item sold
          </Button>
        )}
        {row.kind === "institution_pickup" && row.status !== "done" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void act(() => setRequestStatus(row.id, "done"))}
          >
            Pickup done
          </Button>
        )}
        {row.status !== "cancelled" && row.status !== "sold" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void act(() => setRequestStatus(row.id, "cancelled"))}
          >
            Cancel
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
