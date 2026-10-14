"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CATEGORIES, PART_TYPES, type Category, type PartType } from "@/features/inventory/model";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { formatPrice } from "@/lib/utils/money";
import { downloadReceipt } from "@/features/account/api";
import {
  convertSubmission,
  guessCategory,
  listPayouts,
  listPickups,
  listShopSubmissions,
  makeOffer,
  recordPayout,
  rejectSubmission,
  setPickupStatus,
  type HubPayout,
  type HubPickup,
  type ShopSubmission,
} from "../loop";
import { reportHubError } from "../useHubData";
import { hubInput, PageTitle, Panel } from "./ui";

const GROUPS = [
  { title: "Waiting for review", statuses: ["Pending", "Under Review"] },
  { title: "Accepted: collect on the route", statuses: ["Accepted"] },
  { title: "Offered: waiting for the shop", statuses: ["Offered", "Contacted"] },
  { title: "Bought", statuses: ["Purchased", "Processing", "Completed"] },
  { title: "Declined by the shop", statuses: ["Declined"] },
  { title: "Rejected", statuses: ["Rejected"] },
];

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export function SubmissionsPage() {
  const [rows, setRows] = useState<ShopSubmission[] | null>(null);
  const [pickups, setPickups] = useState<HubPickup[]>([]);
  const [payouts, setPayouts] = useState<HubPayout[]>([]);
  const load = useCallback(() => {
    Promise.all([listShopSubmissions(), listPickups(), listPayouts()])
      .then(([s, p, m]) => {
        setRows(s);
        setPickups(p);
        setPayouts(m);
      })
      .catch(reportHubError);
  }, []);
  useEffect(() => {
    if (SHARED_DATABASE) load();
  }, [load]);

  return (
    <>
      <PageTitle
        title="Shop submissions"
        description="Items partner shops want to sell to ReLoop. Make an offer or reject. The shop accepts or declines on its account; accepting books the next route day. Once collected, turn the lot into hub items, then record the payment for its receipt."
      />
      {!SHARED_DATABASE ? (
        <p className="text-sm text-muted">Shop submissions are kept in the shared database.</p>
      ) : !rows ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        GROUPS.map((g) => {
          const group = rows.filter((r) => g.statuses.includes(r.status));
          return (
            <Panel key={g.title} title={`${g.title} (${group.length})`} className="mb-6">
              {group.length === 0 ? (
                <p className="text-sm text-muted">None.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {group.map((r) => (
                    <SubmissionRow
                      key={r.id}
                      row={r}
                      pickup={pickups.find((p) => p.shop_submission_id === r.id)}
                      payout={payouts.find((p) => p.shop_submission_id === r.id)}
                      onChanged={load}
                    />
                  ))}
                </ul>
              )}
            </Panel>
          );
        })
      )}
    </>
  );
}

function SubmissionRow({
  row,
  pickup,
  payout,
  onChanged,
}: {
  row: ShopSubmission;
  pickup: HubPickup | undefined;
  payout: HubPayout | undefined;
  onChanged: () => void;
}) {
  const guess = guessCategory(`${row.description ?? ""} ${row.item_name}`);
  const [offer, setOffer] = useState(row.offer_price === null ? "" : String(row.offer_price));
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<Category>(guess.category);
  const [partType, setPartType] = useState<PartType>(guess.partType ?? "other");
  const [unit, setUnit] = useState(row.offer_price === null ? "" : String(row.offer_price));
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
  const id = `sub-${row.id}`;
  const reviewing = row.status === "Pending" || row.status === "Under Review";
  const offered = row.status === "Offered" || row.status === "Contacted";
  const accepted = row.status === "Accepted";
  const bought = ["Purchased", "Processing", "Completed"].includes(row.status);

  return (
    <li className="py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          #{row.id} · {row.item_name} × {row.quantity}
        </h3>
        <span className="text-xs text-muted">
          {row.shop?.shop_name ?? (row.shop_owner_id ? "Shop" : "Deleted account")} ·{" "}
          {new Date(row.created_at).toLocaleDateString("en-IN")}
        </span>
      </div>
      <p className="mt-1 text-muted">
        {[row.brand, row.model].filter(Boolean).join(" ")} · condition {row.condition}
        {row.asking_price !== null && (
          <> · asks {formatPrice(Number(row.asking_price) * 100)} each</>
        )}
        {row.shop?.phone && (
          <>
            {" "}
            · {row.shop.owner_name}, {row.shop.phone}
          </>
        )}
      </p>
      {row.description && (
        <p className="mt-1 whitespace-pre-line text-ink-soft">{row.description}</p>
      )}
      {row.offer_price !== null && (
        <p className="mt-1">
          Offer: <strong>{formatPrice(Number(row.offer_price) * 100)}</strong> each
          {row.offer_note && <> · “{row.offer_note}”</>}
        </p>
      )}
      {row.rejection_reason && <p className="mt-1 text-danger">Rejected: {row.rejection_reason}</p>}
      {(accepted || row.status === "Declined") && row.owner_response_at && (
        <p className="mt-1">
          {accepted ? "Accepted" : "Declined"} by the shop on{" "}
          {new Date(row.owner_response_at).toLocaleDateString("en-IN")}
          {row.owner_note && <> · “{row.owner_note}”</>}
        </p>
      )}
      {pickup && pickup.status === "scheduled" && (
        <p className="mt-1 flex flex-wrap items-center gap-2">
          <span>
            Pickup <strong>{pickup.route_date}</strong>
            {pickup.market && <> · {pickup.market}</>}
            {pickup.times_missed > 0 && <> · moved {pickup.times_missed}×</>}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void act(() => setPickupStatus(pickup.id, "missed"))}
          >
            Missed: move to the next route day
          </Button>
        </p>
      )}
      {row.status === "Purchased" && row.purchase_price !== null && (
        <p className="mt-1">
          Purchased for {formatPrice(Number(row.purchase_price) * 100)} ·{" "}
          <Link className="text-brand-600 underline" href="/hub/items">
            see items
          </Link>
        </p>
      )}

      {reviewing && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label htmlFor={`${id}-offer`} className="grid gap-1 text-xs font-medium">
            Offer per item (₹)
            <input
              id={`${id}-offer`}
              inputMode="decimal"
              className={`${hubInput} w-32`}
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />
          </label>
          <label htmlFor={`${id}-note`} className="grid min-w-56 flex-1 gap-1 text-xs font-medium">
            Note the shop will see (required to reject)
            <input
              id={`${id}-note`}
              className={hubInput}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void act(() => makeOffer(row.id, Number(offer), note))}
          >
            Make offer
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void act(() => rejectSubmission(row.id, note))}
          >
            Reject
          </Button>
        </div>
      )}

      {(offered || accepted) && (
        <div className="mt-3 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold">
            {accepted ? "Collected?" : "Bought at the counter (the shop agreed in person)?"} Create{" "}
            {row.quantity} hub item{row.quantity === 1 ? "" : "s"}:
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label htmlFor={`${id}-cat`} className="grid gap-1 text-xs font-medium">
              Category
              <select
                id={`${id}-cat`}
                className={hubInput}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.single}
                  </option>
                ))}
              </select>
            </label>
            {category === "part" && (
              <label htmlFor={`${id}-part`} className="grid gap-1 text-xs font-medium">
                Part type
                <select
                  id={`${id}-part`}
                  className={hubInput}
                  value={partType}
                  onChange={(e) => setPartType(e.target.value as PartType)}
                >
                  {PART_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label htmlFor={`${id}-unit`} className="grid gap-1 text-xs font-medium">
              Paid per item (₹)
              <input
                id={`${id}-unit`}
                inputMode="decimal"
                className={`${hubInput} w-32`}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </label>
            <Button
              size="sm"
              disabled={busy || unit === ""}
              onClick={() =>
                void act(async () =>
                  setTags(await convertSubmission(row.id, category, partType, Number(unit) * 100)),
                )
              }
            >
              Create hub items
            </Button>
          </div>
        </div>
      )}
      {bought && row.purchase_price !== null && Number(row.purchase_price) > 0 && (
        <PayoutBox row={row} payout={payout} onChanged={onChanged} />
      )}
      {tags.length > 0 && (
        <p role="status" className="mt-2 text-grade-a">
          Created{" "}
          {tags.map((t, i) => (
            <span key={t}>
              {i > 0 && ", "}
              <Link className="underline" href={`/hub/items/${t}`}>
                {t}
              </Link>
            </span>
          ))}
          . Grade them at intake.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

/** A bought lot's payment: the receipt once recorded, or the form to record it. */
function PayoutBox({
  row,
  payout,
  onChanged,
}: {
  row: ShopSubmission;
  payout: HubPayout | undefined;
  onChanged: () => void;
}) {
  const [method, setMethod] = useState<"cash" | "upi">("cash");
  const [paidAt, setPaidAt] = useState(today);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = `pay-${row.id}`;
  if (payout)
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-sunken p-3">
        <span>
          Paid {formatPrice(payout.amount_paise)} by {payout.method === "upi" ? "UPI" : "cash"} on{" "}
          {payout.paid_at} · receipt <span className="font-mono">{payout.receipt_no}</span>
          {payout.reference && <> · ref {payout.reference}</>}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            void downloadReceipt(payout.receipt_no).catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "The receipt couldn't be downloaded."),
            )
          }
        >
          <Download className="size-4" aria-hidden="true" /> Receipt (PDF)
        </Button>
        {error && (
          <p role="alert" className="w-full text-danger">
            {error}
          </p>
        )}
      </div>
    );
  return (
    <form
      className="mt-3 rounded-lg border border-line p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        recordPayout(row.id, { method, paidAt, reference, note })
          .then(onChanged)
          .catch((err: unknown) =>
            setError(err instanceof Error ? err.message : "That didn't work."),
          )
          .finally(() => setBusy(false));
      }}
    >
      <p className="text-xs font-semibold">
        Record the payment of {formatPrice(Number(row.purchase_price) * 100)} (the shop gets a
        numbered receipt):
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label htmlFor={`${id}-method`} className="grid gap-1 text-xs font-medium">
          Paid by
          <select
            id={`${id}-method`}
            className={hubInput}
            value={method}
            onChange={(e) => setMethod(e.target.value as "cash" | "upi")}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
        </label>
        <label htmlFor={`${id}-date`} className="grid gap-1 text-xs font-medium">
          Date paid
          <input
            id={`${id}-date`}
            type="date"
            className={hubInput}
            value={paidAt}
            max={today()}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </label>
        <label htmlFor={`${id}-ref`} className="grid gap-1 text-xs font-medium">
          UPI reference (staff only)
          <input
            id={`${id}-ref`}
            className={hubInput}
            maxLength={80}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <label htmlFor={`${id}-note`} className="grid min-w-48 flex-1 gap-1 text-xs font-medium">
          Internal note (staff only)
          <input
            id={`${id}-note`}
            className={hubInput}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <Button size="sm" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Record payment"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
