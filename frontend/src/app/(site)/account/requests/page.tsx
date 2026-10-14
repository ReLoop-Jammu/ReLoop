"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatusPill } from "@/components/ui/Badge";
import { cancelMyRequest, myRequests, type MyRequest } from "@/features/account/api";
import { RequireAccount } from "@/features/account/RequireAccount";
import { isOpen, KIND_LABEL, stageLabel } from "@/features/requests/stages";

export default function MyRequestsPage() {
  return (
    <RequireAccount>
      {() => (
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>My ReLoop</Eyebrow>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">My requests</h1>
            <p className="mt-2 text-muted">
              Reservations, questions and pickup bookings you sent while logged in.
            </p>
            <Requests />
          </div>
        </Container>
      )}
    </RequireAccount>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Requests() {
  const [rows, setRows] = useState<MyRequest[] | null>(null);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    myRequests()
      .then((r) => alive && setRows(r))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Couldn't load."));
    return () => {
      alive = false;
    };
  }, []);

  async function cancel(id: string) {
    setBusy(true);
    setError("");
    try {
      await cancelMyRequest(id);
      setRows(await myRequests());
      setAsking(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !rows)
    return (
      <p role="alert" className="mt-6 text-danger">
        {error}
      </p>
    );
  if (!rows)
    return (
      <p role="status" className="mt-6 text-muted">
        Loading your requests…
      </p>
    );
  if (rows.length === 0)
    return (
      <div className="mt-8">
        <EmptyState
          title="No requests yet"
          description="Reserve an item or ask about one from its page in the shop while logged in, and it appears here."
          actions={<ButtonLink href="/shop">Browse the shop</ButtonLink>}
        />
      </div>
    );
  return (
    <>
      {error && (
        <p role="alert" className="mt-6 text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="mt-8 grid gap-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-card border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  {KIND_LABEL[r.kind] ?? "Request"}
                  {r.item_id && (
                    <>
                      {" for "}
                      <Link
                        href={`/shop/${r.item_id}`}
                        className="font-mono text-brand-600 underline"
                      >
                        {r.item_id}
                      </Link>
                    </>
                  )}
                </p>
                {r.item_title && <p className="text-sm text-muted">{r.item_title}</p>}
                <p className="mt-1 text-sm text-muted">Sent {when(r.created_at)}</p>
              </div>
              <StatusPill
                tone={isOpen(r.status) ? "info" : r.status === "cancelled" ? "neutral" : "success"}
              >
                {stageLabel(r)}
              </StatusPill>
            </div>
            {r.status === "cancelled" && r.cancel_reason && (
              <p className="mt-3 text-sm text-ink-soft">ReLoop&apos;s reason: {r.cancel_reason}</p>
            )}
            {r.status === "scheduled" && r.scheduled_for && (
              <p className="mt-3 text-sm text-ink-soft">Pickup on {when(r.scheduled_for)}.</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ButtonLink href={`/status/${r.status_token}`} variant="secondary" size="sm">
                Status page
              </ButtonLink>
              {isOpen(r.status) &&
                (asking === r.id ? (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    Cancel this {KIND_LABEL[r.kind]?.toLowerCase() ?? "request"}?
                    <Button
                      size="sm"
                      variant="dark"
                      disabled={busy}
                      onClick={() => void cancel(r.id)}
                    >
                      {busy ? "Cancelling…" : "Yes, cancel it"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAsking(null)}>
                      Keep it
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setAsking(r.id)}>
                    Cancel
                  </Button>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
