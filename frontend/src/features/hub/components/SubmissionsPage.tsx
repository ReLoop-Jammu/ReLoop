"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CATEGORIES, PART_TYPES, type Category, type PartType } from "@/features/inventory/model";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { formatPrice } from "@/lib/utils/money";
import {
  convertSubmission,
  guessCategory,
  listShopSubmissions,
  makeOffer,
  rejectSubmission,
  type ShopSubmission,
} from "../loop";
import { reportHubError } from "../useHubData";
import { hubInput, PageTitle, Panel } from "./ui";

const GROUPS = [
  { title: "Waiting for review", statuses: ["Pending", "Under Review"] },
  { title: "Offered: waiting for the shop", statuses: ["Offered", "Contacted"] },
  { title: "Purchased", statuses: ["Purchased", "Processing", "Completed"] },
  { title: "Rejected", statuses: ["Rejected"] },
];

export function SubmissionsPage() {
  const [rows, setRows] = useState<ShopSubmission[] | null>(null);
  const load = useCallback(() => {
    listShopSubmissions().then(setRows).catch(reportHubError);
  }, []);
  useEffect(() => {
    if (SHARED_DATABASE) load();
  }, [load]);

  return (
    <>
      <PageTitle
        title="Shop submissions"
        description="Items partner shops want to sell to ReLoop. Make an offer or reject; once the shop accepts (by WhatsApp), turn the offer into hub items."
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
                    <SubmissionRow key={r.id} row={r} onChanged={load} />
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

function SubmissionRow({ row, onChanged }: { row: ShopSubmission; onChanged: () => void }) {
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

      {offered && (
        <div className="mt-3 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold">
            Shop accepted? Create {row.quantity} hub item{row.quantity === 1 ? "" : "s"}:
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
