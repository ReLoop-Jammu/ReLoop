"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Submission } from "@/features/inventory/model";
import { SHARED_DATABASE, setItemStatus } from "@/features/inventory/store";
import { ticketRef } from "@/features/sell/requests";
import { IS_SIMULATION } from "@/lib/environment";
import { cancelRequest, listRequests, setRequestStatus, type HubRequest } from "../loop";
import { reportHubError } from "../useHubData";
import { hubInput, PageTitle, Panel } from "./ui";

const KINDS: { value: Submission["kind"]; label: string }[] = [
  { value: "reservation", label: "Reservations" },
  { value: "enquiry", label: "Questions" },
  { value: "institution_pickup", label: "Institution pickups" },
];
const STATUSES: Submission["status"][] = [
  "new",
  "contacted",
  "scheduled",
  "collected",
  "sold",
  "cancelled",
  "done",
];
const OPEN = new Set<Submission["status"]>(["new", "contacted", "scheduled", "collected"]);

const waLink = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

export function RequestsPage() {
  const [rows, setRows] = useState<HubRequest[] | null>(null);
  const [kind, setKind] = useState<Submission["kind"] | "all">("all");
  const [status, setStatus] = useState<Submission["status"] | "open">("open");
  const [search, setSearch] = useState("");
  const load = useCallback(() => {
    listRequests().then(setRows).catch(reportHubError);
  }, []);
  useEffect(() => {
    if (SHARED_DATABASE) load();
  }, [load]);

  // A ticket quoted by phone may be closed, so a search looks at every status.
  const needle = search.trim().toUpperCase().replace(/^#/, "");
  const digits = needle.replace(/\D/g, "");
  const matches = (r: HubRequest) =>
    ticketRef(r.id).includes(needle) ||
    (digits.length >= 4 && (r.fields.phone ?? "").replace(/\D/g, "").includes(digits));
  const shown = (rows ?? []).filter((r) =>
    needle
      ? matches(r)
      : (kind === "all" || r.kind === kind) &&
        (status === "open" ? OPEN.has(r.status) : r.status === status),
  );

  return (
    <>
      <PageTitle
        title="Requests"
        description="Every reservation, question about an item and institution pickup booking from the public site lands here as a ticket (RQ-…), whether or not the person also messaged us. Contact people by WhatsApp, then update the status. Closed requests (sold, cancelled or done) are deleted automatically 12 months after closing."
      />
      {!SHARED_DATABASE ? (
        <p className="text-sm text-muted">Requests are kept in the shared database.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <label className="grid gap-1 text-xs font-medium">
              Ticket or phone
              <input
                className={hubInput}
                type="search"
                value={search}
                placeholder="RQ-3F9A2C"
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
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
                <option value="open">Open (new, contacted, scheduled or collected)</option>
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
  const [pickupDate, setPickupDate] = useState(row.scheduled_for ?? "");
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
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
          <span className="font-mono">{ticketRef(row.id)}</span> · {label.replace(/s$/, "")} ·{" "}
          {name || "No name"}
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
          {row.status === "scheduled" && row.scheduled_for && <> for {row.scheduled_for}</>}
        </span>
      </div>
      {row.from_account && (
        <p className="mt-1 text-xs text-muted">
          Sent from a ReLoop account: the person follows it under My requests and is notified of
          each change.
        </p>
      )}
      {row.status === "cancelled" && (
        <p className="mt-1 text-ink-soft">
          {row.cancelled_by === "buyer"
            ? "Cancelled by the person who sent it."
            : "Cancelled by ReLoop"}
          {row.cancel_reason && <>: {row.cancel_reason}</>}
        </p>
      )}
      {phone && (
        <p className="mt-1">
          {phone} ·{" "}
          {IS_SIMULATION ? (
            <span className="text-muted">WhatsApp (not sent in the simulation)</span>
          ) : (
            <a className="font-semibold text-brand-600 underline" href={waLink(phone)}>
              WhatsApp
            </a>
          )}
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
        {row.kind === "reservation" && row.item_id && OPEN.has(row.status) && (
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
        {row.item_id && OPEN.has(row.status) && (
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
        {row.kind === "institution_pickup" &&
          ["new", "contacted", "scheduled"].includes(row.status) && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!pickupDate) return setError("Choose the pickup date.");
                void act(() => setRequestStatus(row.id, "scheduled", pickupDate));
              }}
            >
              <label className="grid gap-1 text-xs font-medium">
                Pickup date
                <input
                  type="date"
                  className={hubInput}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </label>
              <Button size="sm" variant="secondary" type="submit" disabled={busy}>
                {row.status === "scheduled" ? "Change date" : "Schedule pickup"}
              </Button>
            </form>
          )}
        {row.kind === "institution_pickup" && row.status === "scheduled" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void act(() => setRequestStatus(row.id, "collected"))}
          >
            Mark collected
          </Button>
        )}
        {row.kind !== "reservation" && OPEN.has(row.status) && row.status !== "new" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void act(() => setRequestStatus(row.id, "done"))}
          >
            {row.kind === "institution_pickup" ? "Pickup done" : "Done"}
          </Button>
        )}
        {OPEN.has(row.status) && !cancelling && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setCancelling(true)}>
            Cancel…
          </Button>
        )}
      </div>
      {cancelling && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await cancelRequest(row.id, reason);
              setCancelling(false);
            });
          }}
        >
          <label className="grid min-w-64 flex-1 gap-1 text-xs font-medium">
            Reason (the person sees it)
            <input
              className={hubInput}
              value={reason}
              maxLength={300}
              placeholder="For example: sold in the shop before we could reserve it"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button size="sm" variant="dark" type="submit" disabled={busy}>
            Cancel the request
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setCancelling(false)}>
            Keep it
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
