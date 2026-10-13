"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  listShopOwners,
  reviewShop,
  type ShopOwner,
  type VerificationStatus,
} from "../shop-reviews";
import { RequireRole } from "./RequireRole";
import { hubInput, PageTitle, Panel } from "./ui";

const GROUPS: { status: VerificationStatus; title: string }[] = [
  { status: "pending", title: "Waiting for review" },
  { status: "verified", title: "Verified" },
  { status: "rejected", title: "Rejected" },
];

export function ShopReviewPage() {
  return (
    <RequireRole role="admin">
      <ShopReviews />
    </RequireRole>
  );
}

function ShopReviews() {
  const [shops, setShops] = useState<ShopOwner[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    listShopOwners()
      .then(setShops)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load shops."));
  }, []);
  useEffect(load, [load]);

  const replace = (updated: ShopOwner) =>
    setShops((current) => current?.map((s) => (s.id === updated.id ? updated : s)) ?? null);

  return (
    <>
      <PageTitle
        title="Shop verification"
        description="Check each shop's details and GSTIN (if they have one), then verify or reject it. Only verified shops can submit items."
      />
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/5 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {!shops && !error && <p className="text-sm text-muted">Loading shops…</p>}
      {shops &&
        GROUPS.map(({ status, title }) => {
          const group = shops.filter((s) => s.verification_status === status);
          return (
            <Panel key={status} title={`${title} (${group.length})`} className="mb-6">
              {group.length === 0 ? (
                <p className="text-sm text-muted">None.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {group.map((shop) => (
                    <ShopRow key={shop.id} shop={shop} onSaved={replace} />
                  ))}
                </ul>
              )}
            </Panel>
          );
        })}
    </>
  );
}

function ShopRow({ shop, onSaved }: { shop: ShopOwner; onSaved: (s: ShopOwner) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(decision: "verify" | "reject") {
    setError("");
    setBusy(true);
    try {
      onSaved(await reviewShop(shop.id, decision, note));
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That change wasn't saved.");
    } finally {
      setBusy(false);
    }
  }

  const noteId = `note-${shop.id}`;
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{shop.shop_name}</h3>
        <span className="text-xs text-muted">
          Registered {new Date(shop.created_at).toLocaleDateString("en-IN")}
        </span>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Detail label="Owner" value={shop.owner_name} />
        <Detail label="Phone" value={shop.phone} />
        <Detail label="Email" value={shop.email} />
        <Detail label="GSTIN" value={shop.gstin ?? "Not GST-registered"} />
        <Detail
          label="Address"
          value={[shop.business_address, shop.city].filter(Boolean).join(", ")}
        />
        {shop.review_notes && <Detail label="Review note" value={shop.review_notes} />}
      </dl>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label htmlFor={noteId} className="grid min-w-60 flex-1 gap-1 text-xs font-medium">
          Note (required to reject)
          <input
            id={noteId}
            className={hubInput}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {shop.verification_status !== "verified" && (
          <Button type="button" size="sm" disabled={busy} onClick={() => decide("verify")}>
            Verify
          </Button>
        )}
        {shop.verification_status !== "rejected" && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => decide("reject")}
          >
            Reject
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{value || "—"}</dd>
    </div>
  );
}
