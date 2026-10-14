"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Table, Td, Th } from "@/components/ui/Table";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { authenticatedFetch } from "@/lib/auth-client";
import { RequireRole } from "./RequireRole";
import { Field, PageTitle, Select } from "./ui";

export type AuditEntry = {
  id: number;
  at: string;
  action: string;
  detail: string;
  admin_name: string | null;
  target_name: string | null;
};

const ACTIONS: Record<string, string> = {
  password_reset: "Password reset",
  role_change: "Role change",
  setting_change: "Settings change",
};
const PAGE = 50;

/** One page of the audit log, newest first (admins only). */
export async function loadAudit(action: string | null, before: number | null) {
  const r = await authenticatedFetch("/rest/v1/rpc/admin_audit_entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_before: before, p_limit: PAGE }),
  });
  if (!r.ok) throw new Error("Could not load the audit log.");
  return (await r.json()) as AuditEntry[];
}

export function AuditPage() {
  return (
    <RequireRole role="admin">
      <PageTitle
        title="Audit log"
        description="Every password reset, role change and settings change, with who made it. Passwords and contact details are never recorded."
      />
      {SHARED_DATABASE ? (
        <Audit />
      ) : (
        <p className="text-sm text-muted">The audit log is kept in the shared database.</p>
      )}
    </RequireRole>
  );
}

function Audit() {
  const [action, setAction] = useState("");
  // Kept with the filter they belong to, so a new filter reads as loading.
  const [list, setList] = useState<{ action: string; entries: AuditEntry[]; more: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    loadAudit(action || null, null)
      .then((page) => {
        if (!alive) return;
        setList({ action, entries: page, more: page.length === PAGE });
        setError("");
      })
      .catch(
        (e: unknown) =>
          alive && setError(e instanceof Error ? e.message : "Could not load the audit log."),
      );
    return () => {
      alive = false;
    };
  }, [action]);

  async function older(before: number) {
    setBusy(true);
    try {
      const page = await loadAudit(action || null, before);
      setList(
        (prev) =>
          prev && { action, entries: [...prev.entries, ...page], more: page.length === PAGE },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the audit log.");
    } finally {
      setBusy(false);
    }
  }
  const entries = list?.action === action ? list.entries : null;
  const more = Boolean(list?.more);

  return (
    <div className="grid gap-4">
      <Field label="Show" htmlFor="audit-action" className="max-w-xs">
        <Select id="audit-action" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Everything</option>
          {Object.entries(ACTIONS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {!entries ? (
        !error && (
          <p role="status" className="text-sm text-muted">
            Loading the audit log…
          </p>
        )
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">Nothing recorded yet.</p>
      ) : (
        <>
          <Table caption="Audit log entries">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>What</Th>
                <Th>By</Th>
                <Th>Account</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <Td className="whitespace-nowrap tabular-nums">
                    {new Date(e.at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </Td>
                  <Td>{ACTIONS[e.action] ?? e.action}</Td>
                  <Td>{e.admin_name ?? "Deleted account"}</Td>
                  <Td>{e.target_name ?? "—"}</Td>
                  <Td className="font-mono text-xs break-all">{e.detail || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {more && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void older(entries[entries.length - 1].id)}
              className="justify-self-start"
            >
              {busy ? "Loading…" : "Show older entries"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
