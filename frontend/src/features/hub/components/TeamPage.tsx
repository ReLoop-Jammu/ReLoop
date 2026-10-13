"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSession } from "@/lib/auth-client";
import { listUsers, setAccountRole, type AdminUserRow } from "../admin-users";
import { RequireRole } from "./RequireRole";
import { PageTitle, Panel } from "./ui";

export function TeamPage() {
  return (
    <RequireRole role="admin">
      <Team />
    </RequireRole>
  );
}

function Team() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const me = getSession()?.user.id;

  const load = useCallback(() => {
    listUsers()
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load accounts."));
  }, []);
  useEffect(load, [load]);

  async function change(u: AdminUserRow, staff: boolean, admin: boolean) {
    setError("");
    setBusy(u.id);
    try {
      await setAccountRole(u.id, staff, admin);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That change wasn't saved.");
    } finally {
      setBusy(null);
    }
  }

  const team = (users ?? []).filter((u) => u.isStaff || u.isAdmin);
  const others = (users ?? []).filter((u) => !u.isStaff && !u.isAdmin);
  const row = (u: AdminUserRow) => (
    <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-semibold break-all">
          {u.email}
          {u.id === me && <span className="ml-2 text-xs text-muted">(you)</span>}
        </p>
        <p className="text-muted">
          {u.name || "No name"} · {u.isAdmin ? "admin" : u.isStaff ? "hub staff" : u.role}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={u.isStaff ? "secondary" : "primary"}
          disabled={busy === u.id}
          onClick={() => void change(u, !u.isStaff, u.isAdmin)}
        >
          {u.isStaff ? "Remove from hub staff" : "Make hub staff"}
        </Button>
        <Button
          size="sm"
          variant={u.isAdmin ? "secondary" : "primary"}
          disabled={busy === u.id}
          onClick={() => void change(u, u.isStaff, !u.isAdmin)}
        >
          {u.isAdmin ? "Remove admin" : "Make admin"}
        </Button>
      </div>
    </li>
  );

  return (
    <>
      <PageTitle
        title="Team"
        description="Who can use the hub. Hub staff log intake, grade and sell; admins also verify shops, reset passwords and manage the team. ReLoop always keeps at least one admin."
      />
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/5 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {!users ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <Panel title={`Team (${team.length})`} className="mb-6">
            <ul className="divide-y divide-line">{team.map(row)}</ul>
          </Panel>
          <Panel title={`Other accounts (${others.length})`}>
            {others.length === 0 ? (
              <p className="text-sm text-muted">None.</p>
            ) : (
              <ul className="divide-y divide-line">{others.map(row)}</ul>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
