"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { myShopSubmissions, type ShopSubmission } from "@/features/hub/loop";
import { formatPrice } from "@/lib/utils/money";
import {
  downloadReceipt,
  myPayouts,
  myPickups,
  respondToOffer,
  type MyPayout,
  type MyPickup,
} from "./api";

const SHOWN: Record<string, string> = {
  Pending: "Waiting for review",
  "Under Review": "Being reviewed",
  Offered: "Offer made",
  Contacted: "Offer made",
  Accepted: "You accepted: pickup booked",
  Declined: "You declined the offer",
  Purchased: "Bought by ReLoop",
  Processing: "Bought by ReLoop",
  Completed: "Bought by ReLoop",
  Rejected: "Not accepted",
};

const day = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });

/**
 * A shop owner's own submissions: each status, ReLoop's offer (accept or
 * decline it here), the pickup day, and what ReLoop paid, with receipts.
 */
export function MySubmissions() {
  const [rows, setRows] = useState<ShopSubmission[] | null>(null);
  const [pickups, setPickups] = useState<MyPickup[]>([]);
  const [payouts, setPayouts] = useState<MyPayout[]>([]);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let alive = true;
    Promise.all([myShopSubmissions(), myPickups().catch(() => []), myPayouts().catch(() => [])])
      .then(([s, p, m]) => {
        if (!alive) return;
        setRows(s);
        setPickups(p);
        setPayouts(m);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [version]);

  if (failed)
    return <p className="mt-4 text-sm text-danger">Your submissions couldn&apos;t load.</p>;
  if (!rows) return <p className="mt-4 text-sm text-muted">Loading your submissions…</p>;
  if (rows.length === 0) return <p className="mt-4 text-sm text-muted">No submissions yet.</p>;
  return (
    <div className="mt-4 grid gap-6">
      <ul className="divide-y divide-line rounded-xl border border-line text-sm">
        {rows.map((r) => (
          <SubmissionRow
            key={r.id}
            row={r}
            pickup={pickups.find((p) => p.shop_submission_id === r.id)}
            payout={payouts.find((p) => p.shop_submission_id === r.id)}
            onChanged={reload}
          />
        ))}
      </ul>
      {payouts.length > 0 && <Payments payouts={payouts} />}
    </div>
  );
}

function SubmissionRow({
  row: r,
  pickup,
  payout,
  onChanged,
}: {
  row: ShopSubmission;
  pickup: MyPickup | undefined;
  payout: MyPayout | undefined;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "decline">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = r.status === "Offered" || r.status === "Contacted";
  async function answer(accept: boolean) {
    setBusy(true);
    setError("");
    try {
      await respondToOffer(r.id, accept, accept ? "" : note);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="p-3">
      <p className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">
          {r.item_name} × {r.quantity}
        </span>
        <span>{SHOWN[r.status] ?? r.status}</span>
      </p>
      {r.offer_price !== null && r.status !== "Rejected" && (
        <p className="mt-1">
          ReLoop offers <strong>{formatPrice(Number(r.offer_price) * 100)}</strong> each
          {r.offer_note && <> · {r.offer_note}</>}
        </p>
      )}
      {r.status === "Rejected" && r.rejection_reason && (
        <p className="mt-1 text-muted">{r.rejection_reason}</p>
      )}
      {r.status === "Declined" && r.owner_note && (
        <p className="mt-1 text-muted">Your note: {r.owner_note}</p>
      )}
      {pickup?.status === "scheduled" && (
        <p className="mt-1">
          Pickup on <strong>{day(pickup.route_date)}</strong>, on the route.
          {pickup.times_missed > 0 && " (Moved: we couldn't come on the first day.)"}
        </p>
      )}
      {payout && (
        <p className="mt-1">
          Paid {formatPrice(payout.amount_paise)} by {payout.method === "upi" ? "UPI" : "cash"} ·
          receipt <span className="font-mono">{payout.receipt_no}</span>
        </p>
      )}
      {open && mode === "idle" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => void answer(true)}>
            {busy ? "Saving…" : "Accept the offer"}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setMode("decline")}>
            Decline…
          </Button>
        </div>
      )}
      {open && mode === "decline" && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void answer(false);
          }}
        >
          <label className="grid min-w-56 flex-1 gap-1 text-xs font-medium">
            Anything to tell ReLoop? (optional)
            <input
              className="min-h-10 rounded-lg border border-line bg-surface px-3 text-sm"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <Button size="sm" variant="dark" type="submit" disabled={busy}>
            Decline the offer
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setMode("idle")}>
            Back
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-1 text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

function Payments({ payouts }: { payouts: MyPayout[] }) {
  const [error, setError] = useState("");
  const total = payouts.reduce((s, p) => s + p.amount_paise, 0);
  return (
    <section aria-labelledby="payments-heading">
      <h3 id="payments-heading" className="font-semibold">
        Payments from ReLoop ({formatPrice(total)} in all)
      </h3>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line text-sm">
        {payouts.map((p) => (
          <li key={p.receipt_no} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>
              <span className="font-mono">{p.receipt_no}</span> · {p.item_name} ·{" "}
              {new Date(`${p.paid_at}T00:00:00+05:30`).toLocaleDateString("en-IN", {
                dateStyle: "medium",
              })}
            </span>
            <span className="flex items-center gap-3">
              <strong>{formatPrice(p.amount_paise)}</strong>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Receipt (PDF) for ${p.receipt_no}`}
                onClick={() =>
                  void downloadReceipt(p.receipt_no).catch((e: unknown) =>
                    setError(
                      e instanceof Error ? e.message : "The receipt couldn't be downloaded.",
                    ),
                  )
                }
              >
                <Download className="size-4" aria-hidden="true" />
                Receipt (PDF)
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
