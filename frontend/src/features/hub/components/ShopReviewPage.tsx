"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  listShopOwners,
  reviewShop,
  setMapListing,
  type ShopOwner,
  type VerificationStatus,
} from "../shop-reviews";
import { countDriveScans } from "@/features/locations/scans";
import { LOCATIONS } from "@/config/locations";
import { DRIVE_LINK } from "@/config/locations";
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
      <DriveScans />
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
      {shop.verification_status === "verified" && <MapControls shop={shop} onSaved={onSaved} />}
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

function DriveScans() {
  const [scans, setScans] = useState<number | null>(null);
  useEffect(() => {
    countDriveScans()
      .then(setScans)
      .catch(() => setScans(null));
  }, []);
  return (
    <Panel title="Awareness drive" className="mb-6">
      <p className="text-sm">
        QR code scans ({DRIVE_LINK.campaign}): <strong>{scans ?? "—"}</strong>
      </p>
      <p className="mt-1 text-xs text-muted">
        Counts visits to {DRIVE_LINK.publicUrl}. Link previews and crawlers aren&apos;t counted.
      </p>
    </Panel>
  );
}

/** The pickup-route markets, as approximate positions for the map. */
const MARKETS = LOCATIONS.route.stops.filter((s) => s.name !== LOCATIONS.hub.name);
const today = () => new Date().toISOString().slice(0, 10);

function MapControls({ shop, onSaved }: { shop: ShopOwner; onSaved: (s: ShopOwner) => void }) {
  const [agreed, setAgreed] = useState(shop.show_on_map);
  const [date, setDate] = useState(shop.map_consent_at?.slice(0, 10) ?? today());
  const [market, setMarket] = useState(shop.map_market || MARKETS[0].name);
  const [lat, setLat] = useState(String(shop.map_lat ?? ""));
  const [lng, setLng] = useState(String(shop.map_lng ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preset = MARKETS.find((m) => m.name === market);
  const id = `map-${shop.id}`;

  async function save(show: boolean) {
    setError("");
    setBusy(true);
    try {
      const position =
        preset && !lat
          ? { lat: preset.lat, lng: preset.lng }
          : { lat: Number(lat), lng: Number(lng) };
      await setMapListing(
        shop.id,
        show
          ? { show: true, consentDate: date, market, ...position, approximate: !lat }
          : { show: false },
      );
      onSaved({
        ...shop,
        show_on_map: show,
        ...(show && {
          map_consent_at: `${date}T00:00:00Z`,
          map_market: market,
          map_lat: position.lat,
          map_lng: position.lng,
          map_approximate: !lat,
        }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That change wasn't saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-line p-3 text-sm">
      <p className="font-semibold">
        Public map:{" "}
        {shop.show_on_map ? `shown (agreed ${shop.map_consent_at?.slice(0, 10)})` : "not shown"}
      </p>
      {shop.show_on_map ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={busy}
          onClick={() => void save(false)}
        >
          Take off the map
        </Button>
      ) : (
        <div className="mt-2 grid gap-2">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            The shop agreed to be shown on ReLoop&apos;s public map.
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label htmlFor={`${id}-date`} className="grid gap-1 text-xs font-medium">
              Agreed on
              <input
                id={`${id}-date`}
                type="date"
                className={hubInput}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label htmlFor={`${id}-market`} className="grid gap-1 text-xs font-medium">
              Market
              <select
                id={`${id}-market`}
                className={hubInput}
                value={market}
                onChange={(e) => setMarket(e.target.value)}
              >
                {MARKETS.map((m) => (
                  <option key={m.name}>{m.name}</option>
                ))}
              </select>
            </label>
            <label htmlFor={`${id}-lat`} className="grid gap-1 text-xs font-medium">
              Exact latitude (optional)
              <input
                id={`${id}-lat`}
                inputMode="decimal"
                className={`${hubInput} w-36`}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label htmlFor={`${id}-lng`} className="grid gap-1 text-xs font-medium">
              Exact longitude (optional)
              <input
                id={`${id}-lng`}
                inputMode="decimal"
                className={`${hubInput} w-36`}
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </label>
            <Button size="sm" disabled={busy || !agreed} onClick={() => void save(true)}>
              Show on map
            </Button>
          </div>
          <p className="text-xs text-muted">
            Without exact coordinates the shop is placed at its market, marked approximate.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
