"use client";

import { useEffect, useState } from "react";
import { myShopSubmissions, type ShopSubmission } from "@/features/hub/loop";
import { SITE } from "@/lib/site";
import { formatPrice } from "@/lib/utils/money";

const SHOWN: Record<string, string> = {
  Pending: "Waiting for review",
  "Under Review": "Being reviewed",
  Offered: "Offer made",
  Contacted: "Offer made",
  Purchased: "Bought by ReLoop",
  Processing: "Bought by ReLoop",
  Completed: "Bought by ReLoop",
  Rejected: "Not accepted",
};

/** A shop owner's own submissions, with each status and ReLoop's offer. */
export function MySubmissions() {
  const [rows, setRows] = useState<ShopSubmission[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    myShopSubmissions()
      .then(setRows)
      .catch(() => setFailed(true));
  }, []);

  if (failed)
    return <p className="mt-4 text-sm text-danger">Your submissions couldn&apos;t load.</p>;
  if (!rows) return <p className="mt-4 text-sm text-muted">Loading your submissions…</p>;
  if (rows.length === 0) return <p className="mt-4 text-sm text-muted">No submissions yet.</p>;
  return (
    <div className="mt-5">
      <h3 className="font-semibold">My submissions</h3>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line text-sm">
        {rows.map((r) => (
          <li key={r.id} className="p-3">
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
            {(r.status === "Offered" || r.status === "Contacted") && SITE.whatsapp && (
              <a
                className="mt-1 inline-block font-semibold text-brand-600 underline"
                href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hi ReLoop, I accept your offer for submission #${r.id} (${r.item_name}).`)}`}
              >
                Message us to accept
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
