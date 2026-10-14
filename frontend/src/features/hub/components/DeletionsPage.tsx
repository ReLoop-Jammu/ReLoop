"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { authenticatedFetch } from "@/lib/auth-client";
import { refreshHubBadges } from "../badges";
import { RequireRole } from "./RequireRole";
import { hubInput, PageTitle, Panel } from "./ui";

type Queued = {
  id: string;
  created_at: string;
  reason: string;
  full_name: string | null;
  role: string | null;
  shop_name: string | null;
  is_team: boolean;
  purchased_lots: number;
  requests: number;
};

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await authenticatedFetch(`/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await r.text();
  const data = text ? (JSON.parse(text) as { message?: string }) : null;
  if (!r.ok) throw new Error(data?.message ?? "That didn't work.");
  return data as T;
}

export function DeletionsPage() {
  return (
    <RequireRole role="admin">
      <PageTitle
        title="Account deletions"
        description="People who asked for their account and data to be deleted. Answer within 30 days, as the privacy page promises. Deleting keeps purchase records with the name replaced by “Deleted account”."
      />
      {SHARED_DATABASE ? (
        <Queue />
      ) : (
        <p className="text-sm text-muted">Accounts are kept in the shared database.</p>
      )}
    </RequireRole>
  );
}

const daysLeft = (iso: string) =>
  30 - Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

function Queue() {
  const [rows, setRows] = useState<Queued[] | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    rpc<Queued[]>("deletion_queue")
      .then(
        (r) =>
          alive &&
          setRows(
            r.map((x) => ({
              ...x,
              purchased_lots: Number(x.purchased_lots),
              requests: Number(x.requests),
            })),
          ),
      )
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Couldn't load."));
    return () => {
      alive = false;
    };
  }, [version]);
  const reload = () => {
    setVersion((v) => v + 1);
    void refreshHubBadges();
  };
  if (error && !rows)
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  if (!rows)
    return (
      <p role="status" className="text-sm text-muted">
        Loading…
      </p>
    );
  if (rows.length === 0) return <p className="text-sm text-muted">No open deletion requests.</p>;
  return (
    <div className="grid gap-4">
      {rows.map((r) => (
        <DeletionRow key={r.id} row={r} onDone={reload} />
      ))}
    </div>
  );
}

function DeletionRow({ row, onDone }: { row: Queued; onDone: () => void }) {
  const [mode, setMode] = useState<"idle" | "delete" | "refuse">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const left = daysLeft(row.created_at);
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await work();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title={row.full_name ?? "Unknown account"}>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-muted">Account</dt>
        <dd>
          {row.role === "shop_owner"
            ? `Shop owner${row.shop_name ? `: ${row.shop_name}` : ""}`
            : (row.role ?? "—")}
          {row.is_team && " · on the hub team"}
        </dd>
        <dt className="text-muted">Asked on</dt>
        <dd>
          {new Date(row.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })} ·{" "}
          <strong className={left <= 7 ? "text-danger" : undefined}>
            {left > 0 ? `${left} days left` : "overdue"}
          </strong>
        </dd>
        <dt className="text-muted">Kept anonymised</dt>
        <dd>
          {row.purchased_lots} bought lot(s), {row.requests} request(s)
        </dd>
        {row.reason && (
          <>
            <dt className="text-muted">Their note</dt>
            <dd className="whitespace-pre-line">{row.reason}</dd>
          </>
        )}
      </dl>
      {row.is_team && (
        <p className="mt-3 text-sm text-warning">
          Remove them from the team (Team page) before deleting the account.
        </p>
      )}
      {mode === "idle" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="dark" onClick={() => setMode("delete")} disabled={row.is_team}>
            Delete the account…
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setMode("refuse")}>
            Decline…
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <div className="mt-4 rounded-lg bg-danger-bg p-3 text-sm">
          <p className="font-semibold text-danger">This can&apos;t be undone.</p>
          <p className="mt-1 text-ink-soft">
            The account, profile, shop record and notifications are deleted now. Confirm you checked
            it&apos;s really them (by phone) before going ahead.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="dark"
              disabled={busy}
              onClick={() => void run(() => rpc("approve_account_deletion", { p_request: row.id }))}
            >
              {busy ? "Deleting…" : "Yes, delete the account"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Back
            </Button>
          </div>
        </div>
      )}
      {mode === "refuse" && (
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => rpc("refuse_account_deletion", { p_request: row.id, p_note: note }));
          }}
        >
          <label className="grid min-w-64 flex-1 gap-1 text-xs font-medium">
            Why (they see this)
            <input
              className={hubInput}
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <Button size="sm" type="submit" disabled={busy}>
            Decline the request
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setMode("idle")}>
            Back
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Panel>
  );
}
