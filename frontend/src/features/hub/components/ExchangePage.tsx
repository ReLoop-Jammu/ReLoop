"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import {
  LISTING_LABEL,
  approveListing,
  exchangeSales,
  hubListings,
  payPartSale,
  publishListingPhotos,
  receiveListing,
  rejectListing,
  type ExchangeSale,
  type HubListing,
} from "@/features/exchange/api";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { weeklyPriceCuts, type PriceCut } from "@/features/scrap/api";
import { formatPrice } from "@/lib/utils/money";
import { refreshHubBadges } from "../badges";
import { Input, PageTitle, Panel } from "./ui";

export function ExchangePage() {
  return (
    <>
      <PageTitle
        title="Parts Exchange"
        description="Verified shops list parts they harvest. Receive the part (it gets a tag), test and wipe it like any part, then approve the listing. ReLoop records the commission when it sells and pays the shop after the 7-day return window."
      />
      {SHARED_DATABASE ? (
        <Exchange />
      ) : (
        <p className="text-sm text-muted">The Parts Exchange is kept in the shared database.</p>
      )}
    </>
  );
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Exchange() {
  const [listings, setListings] = useState<HubListing[] | null>(null);
  const [sales, setSales] = useState<ExchangeSale[]>([]);
  const [cuts, setCuts] = useState<PriceCut[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const reload = useCallback(() => {
    Promise.all([hubListings(), exchangeSales(), weeklyPriceCuts()])
      .then(([l, s, c]) => {
        setListings(l);
        setSales(s);
        setCuts(c);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load."));
    void refreshHubBadges();
  }, []);
  useEffect(reload, [reload]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setError("");
    setMsg("");
    try {
      await fn();
      setMsg(done);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    }
  };

  const open = (listings ?? []).filter((l) => l.status === "submitted" || l.status === "at_hub");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      {error && (
        <Notice tone="danger" role="alert" className="mb-4">
          {error}
        </Notice>
      )}
      {msg && (
        <Notice tone="success" role="status" className="mb-4">
          {msg}
        </Notice>
      )}
      <Panel title={`Listings waiting (${open.length})`}>
        {listings === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : open.length === 0 ? (
          <p className="text-sm text-muted">No listings waiting.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {open.map((l) => (
              <li key={l.id} className="grid gap-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {l.part_type.replace("_", " ")} ·{" "}
                    {[l.brand, l.model].filter(Boolean).join(" ") || "no model"} · asking{" "}
                    {formatPrice(l.asking_paise)}
                  </span>
                  <span className="text-muted">
                    {LISTING_LABEL[l.status]} · sent {day(l.created_at)}
                  </span>
                </div>
                {l.description && <p className="text-ink-soft">{l.description}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {l.status === "submitted" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        void run(() => receiveListing(l.id), "Received: the part has its tag.")
                      }
                    >
                      Received at the hub
                    </Button>
                  )}
                  {l.status === "at_hub" && l.item_id && (
                    <>
                      <Link
                        href={`/hub/items/${l.item_id}`}
                        className="font-semibold text-brand-600 underline"
                      >
                        {l.item_id}: test and wipe
                      </Link>
                      <Button
                        size="sm"
                        onClick={() =>
                          void run(async () => {
                            await approveListing(l.id);
                            await publishListingPhotos(l.id).catch(() => 0);
                          }, "Approved and listed.")
                        }
                      >
                        Approve and list
                      </Button>
                    </>
                  )}
                  <Input
                    aria-label={`Why reject ${l.id}`}
                    placeholder="Reason to reject"
                    className="max-w-56"
                    value={reason[l.id] ?? ""}
                    onChange={(e) => setReason({ ...reason, [l.id]: e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void run(
                        () => rejectListing(l.id, reason[l.id] ?? ""),
                        "Rejected: the shop was told why.",
                      )
                    }
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Sales and shop payouts" className="mt-6 overflow-x-auto">
        {sales.length === 0 ? (
          <p className="text-sm text-muted">No sales yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  Part
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Sold for
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Commission
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Shop share
                </th>
                <th scope="col" className="py-2 font-medium">
                  Pay from
                </th>
                <th scope="col" className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 font-mono text-xs">{s.item_id}</td>
                  <td className="py-2 text-right">{formatPrice(Number(s.sold_paise))}</td>
                  <td className="py-2 text-right">
                    {formatPrice(Number(s.commission_paise))} ({s.commission_pct}%)
                  </td>
                  <td className="py-2 text-right">{formatPrice(Number(s.shop_share_paise))}</td>
                  <td className="py-2">{day(s.payout_due_on)}</td>
                  <td className="py-2 text-right">
                    {s.status === "sold" ? (
                      <Button
                        size="sm"
                        disabled={s.payout_due_on > today}
                        onClick={() =>
                          void run(
                            () => payPartSale(s.id),
                            "Paid: the receipt is in the shop's account.",
                          )
                        }
                      >
                        {s.payout_due_on > today ? "Within the return window" : "Pay the shop"}
                      </Button>
                    ) : (
                      <span className="text-muted">
                        {s.status === "paid" ? "Paid" : "Refunded"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Price cuts this week" className="mt-6">
        {cuts.length === 0 ? (
          <p className="text-sm text-muted">No parts were cut in the last 7 days.</p>
        ) : (
          <>
            <ul className="text-sm">
              {cuts.map((c) => (
                <li key={c.item_id} className="flex justify-between gap-3 py-1">
                  <span>
                    <span className="font-mono text-xs">{c.item_id}</span> {c.title}
                  </span>
                  <span className="tabular-nums">{formatPrice(Number(c.current_paise))}</span>
                </li>
              ))}
            </ul>
            <ShareCuts cuts={cuts} />
          </>
        )}
      </Panel>
    </>
  );
}

function ShareCuts({ cuts }: { cuts: PriceCut[] }) {
  const text = `ReLoop Parts Exchange: price cuts this week\n${cuts
    .map((c) => `${c.title}: ${formatPrice(Number(c.current_paise))} (${c.item_id})`)
    .join("\n")}\n${typeof window === "undefined" ? "" : window.location.origin}/parts`;
  return (
    <p className="mt-3 text-sm">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        className="font-semibold text-brand-600 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Share this list on WhatsApp
      </a>
    </p>
  );
}
