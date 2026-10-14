"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { RequireAccount } from "@/features/account/RequireAccount";
import {
  CLAIM_LABEL,
  isClosedClaim,
  myClaims,
  myWarrantyItems,
  openClaim,
  type MyClaim,
  type WarrantyItem,
} from "@/features/warranty/api";

export default function MyWarrantyPage() {
  return (
    <RequireAccount>
      {() => (
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>My ReLoop</Eyebrow>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Warranty claims</h1>
            <p className="mt-2 text-muted">
              Grade A and B devices you bought through your account are covered for 30 days from the
              sale, for faults present when you bought them.{" "}
              <Link href="/warranty" className="font-semibold text-brand-600 underline">
                The warranty terms
              </Link>
            </p>
            <Warranty />
          </div>
        </Container>
      )}
    </RequireAccount>
  );
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Warranty() {
  const [items, setItems] = useState<WarrantyItem[] | null>(null);
  const [claims, setClaims] = useState<MyClaim[]>([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let alive = true;
    Promise.all([myWarrantyItems(), myClaims()])
      .then(([i, c]) => {
        if (!alive) return;
        setItems(i);
        setClaims(c);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Couldn't load."));
    return () => {
      alive = false;
    };
  }, [version]);

  if (error)
    return (
      <p role="alert" className="mt-6 text-danger">
        {error}
      </p>
    );
  if (!items)
    return (
      <p role="status" className="mt-6 text-muted">
        Loading…
      </p>
    );
  return (
    <div className="mt-8 grid gap-8">
      <section aria-labelledby="items-heading">
        <h2 id="items-heading" className="text-xl font-bold">
          Your devices
        </h2>
        {items.length === 0 ? (
          <div className="mt-3 rounded-card border border-line bg-surface p-5 text-sm text-ink-soft">
            <p>
              Nothing here yet. Devices appear once a reservation you sent while logged in is marked
              sold. Bought at the hub without an account? Message ReLoop with the item&apos;s ID (it
              starts with RL-JMU) and we&apos;ll log the claim for you.
            </p>
            <ButtonLink href="/shop" size="sm" variant="secondary" className="mt-3">
              Browse the shop
            </ButtonLink>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3">
            {items.map((i) => (
              <ItemRow key={i.item_id} item={i} onClaimed={reload} />
            ))}
          </ul>
        )}
      </section>
      {claims.length > 0 && (
        <section aria-labelledby="claims-heading">
          <h2 id="claims-heading" className="text-xl font-bold">
            Your claims
          </h2>
          <ul className="mt-3 grid gap-3">
            {claims.map((c) => (
              <li key={c.id} className="rounded-card border border-line bg-surface p-5 text-sm">
                <p className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold">
                    <span className="font-mono">{c.item_id}</span>
                    {c.title && ` · ${c.title}`}
                  </span>
                  <StatusPill
                    tone={
                      isClosedClaim(c.status)
                        ? c.status === "rejected"
                          ? "danger"
                          : "success"
                        : "info"
                    }
                  >
                    {CLAIM_LABEL[c.status] ?? c.status}
                  </StatusPill>
                </p>
                <p className="mt-2 text-ink-soft">You reported: {c.fault}</p>
                {c.resolution && <p className="mt-1">ReLoop: {c.resolution}</p>}
                <p className="mt-1 text-xs text-muted">
                  Opened {day(c.created_at)}
                  {c.closed_at && ` · closed ${day(c.closed_at)}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ItemRow({ item: i, onClaimed }: { item: WarrantyItem; onClaimed: () => void }) {
  const [open, setOpen] = useState(false);
  const [fault, setFault] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const covered = i.days_left > 0 && (i.grade === "A" || i.grade === "B");
  const claimOpen = i.claim_status !== null && !isClosedClaim(i.claim_status);
  return (
    <li className="rounded-card border border-line bg-surface p-5 text-sm">
      <p className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">
          <span className="font-mono">{i.item_id}</span>
          {i.title && ` · ${i.title}`} · grade {i.grade}
        </span>
        <span className="text-muted">
          Bought {day(i.sold_at)} ·{" "}
          {covered
            ? `${i.days_left} day${i.days_left === 1 ? "" : "s"} of warranty left`
            : "not under warranty"}
        </span>
      </p>
      {claimOpen ? (
        <p className="mt-2 text-ink-soft">You have an open claim for this device (below).</p>
      ) : covered && !open ? (
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => setOpen(true)}>
          Something&apos;s wrong: open a claim
        </Button>
      ) : covered && open ? (
        <form
          className="mt-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            openClaim(i.item_id, fault)
              .then(onClaimed)
              .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : "That didn't work."),
              )
              .finally(() => setBusy(false));
          }}
        >
          <label className="grid gap-1 text-sm font-medium" htmlFor={`fault-${i.item_id}`}>
            What went wrong, and since when?
          </label>
          <textarea
            id={`fault-${i.item_id}`}
            className="min-h-24 rounded-lg border border-line bg-surface px-3 py-2"
            value={fault}
            maxLength={1000}
            onChange={(e) => setFault(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send the claim"}
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
        </form>
      ) : null}
    </li>
  );
}
