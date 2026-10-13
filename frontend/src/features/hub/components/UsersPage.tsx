"use client";

import { Copy, KeyRound, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { listUsers, resetPassword, type AdminUserRow } from "../admin-users";
import { RequireRole } from "./RequireRole";
import { hubInput, PageTitle, Panel } from "./ui";

export function UsersPage() {
  return (
    <RequireRole role="admin">
      <Users />
    </RequireRole>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState<AdminUserRow | null>(null);

  const load = useCallback((query: string) => {
    listUsers(query)
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load accounts."));
  }, []);
  useEffect(() => load(""), [load]);

  const search = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    load(q);
  };

  return (
    <>
      <PageTitle
        title="Users"
        description="Find an account and reset its password when someone can't log in. ReLoop doesn't send emails, so this is how passwords are recovered."
      />
      <form onSubmit={search} className="mb-4 flex max-w-xl gap-2" role="search">
        <label htmlFor="user-search" className="sr-only">
          Search by email, name or phone
        </label>
        <input
          id="user-search"
          className={hubInput}
          placeholder="Email, name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" size="sm" variant="secondary">
          <Search className="size-4" aria-hidden="true" /> Search
        </Button>
      </form>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/5 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {resetting && <ResetPanel user={resetting} onClose={() => setResetting(null)} />}
      <Panel title={users ? `${users.length} account${users.length === 1 ? "" : "s"}` : "Accounts"}>
        {!users ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold break-all">{u.email}</p>
                  <p className="text-muted">
                    {u.name || "No name"} · {u.role}
                    {u.isAdmin && " · admin"}
                    {u.isStaff && !u.isAdmin && " · staff"} · last sign-in{" "}
                    {u.lastSignInAt
                      ? new Date(u.lastSignInAt).toLocaleDateString("en-IN")
                      : "never"}
                    {u.mustChangePassword && " · must change password"}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setResetting(u)}>
                  <KeyRound className="size-4" aria-hidden="true" /> Reset password
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function ResetPanel({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  async function reset() {
    setError("");
    setBusy(true);
    try {
      setPassword(await resetPassword(user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The password wasn't reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={`Reset the password for ${user.email}`} className="mb-6 border-brand-600">
      {password ? (
        <div className="space-y-3 text-sm">
          <p>
            Temporary password, shown <strong>only now</strong>. Give it to {user.name || "them"} by
            phone; they must choose their own when they log in.
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-sunken px-3 py-2 font-mono text-base tracking-wider">
              {password}
            </code>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void navigator.clipboard.writeText(password).then(() => setCopied(true))
              }
            >
              <Copy className="size-4" aria-hidden="true" /> {copied ? "Copied" : "Copy"}
            </Button>
          </p>
          <Button
            size="sm"
            onClick={() => {
              setPassword("");
              onClose();
            }}
          >
            Done (clear it from the screen)
          </Button>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="rounded-lg bg-gold-100 p-3 text-gold-700">
            <strong>Confirm it&apos;s really them first.</strong> Call the phone number on their
            account ({user.phone || "none on file"}) and confirm they asked. Never reset on an email
            or WhatsApp message alone.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I called {user.phone || "them"} and confirmed they asked for a reset.
          </label>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" disabled={!confirmed || busy} onClick={() => void reset()}>
              {busy ? "Resetting…" : "Reset password"}
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
