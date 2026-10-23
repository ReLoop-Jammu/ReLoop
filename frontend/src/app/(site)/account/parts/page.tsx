"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field, Input, Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { RequireAccount } from "@/features/account/RequireAccount";
import {
  EXCHANGE_PART_TYPES,
  LISTING_LABEL,
  canListParts,
  myListings,
  submitListing,
  uploadPartPhoto,
  withdrawListing,
  type ListingStatus,
  type MyListing,
} from "@/features/exchange/api";
import { useSiteSettings } from "@/features/settings/context";
import { formatPrice } from "@/lib/utils/money";

export default function MyPartsPage() {
  return (
    <RequireAccount>
      {() => (
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>My ReLoop</Eyebrow>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Used parts shop</h1>
            <p className="mt-2 text-muted">
              List tested-working parts you harvest. Bring each one to us on the route: staff test
              it, tag it, wipe it where needed and approve the listing.
            </p>
            <Parts />
          </div>
        </Container>
      )}
    </RequireAccount>
  );
}

const TONE: Record<ListingStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  submitted: "info",
  at_hub: "warning",
  approved: "success",
  rejected: "danger",
  withdrawn: "neutral",
};
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Parts() {
  const site = useSiteSettings();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [list, setList] = useState<MyListing[]>([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([canListParts(), myListings()])
      .then(([ok, l]) => {
        if (!alive) return;
        setAllowed(ok);
        setList(l);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Couldn't load."));
    return () => {
      alive = false;
    };
  }, [version]);

  if (error)
    return (
      <Notice tone="danger" role="alert" className="mt-6" title="This page couldn't load">
        {error}
      </Notice>
    );
  if (allowed === null)
    return (
      <p role="status" className="mt-6 text-muted">
        Loading…
      </p>
    );
  return (
    <>
      {!allowed ? (
        <Notice tone="info" className="mt-6" title="Listing parts needs a verified partner shop">
          Your shop account has to be verified, and ReLoop links it to your shop&apos;s stop on the
          weekly route. Message us on WhatsApp if you think that is done. Meanwhile, scrap and
          devices are paid as usual.{" "}
          <Link href="/help" className="font-semibold underline">
            Help, in English and Hindi
          </Link>
        </Notice>
      ) : (
        <ListingForm commissionPct={site.commissionPct} onSaved={reload} />
      )}

      <h2 className="mt-10 text-xl font-bold">My listings</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Nothing listed yet. Your first listing will show here with where it stands.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
          {list.map((l) => (
            <li key={l.id} className="grid gap-1 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {EXCHANGE_PART_TYPES.find((p) => p.value === l.part_type)?.label ?? l.part_type}
                  {(l.brand || l.model) && ` · ${[l.brand, l.model].filter(Boolean).join(" ")}`}
                </span>
                <StatusPill tone={TONE[l.status]}>
                  {l.item_status === "sold" ? "Sold" : LISTING_LABEL[l.status]}
                </StatusPill>
              </div>
              <p className="text-muted">
                Asking {formatPrice(l.asking_paise)} · sent {day(l.created_at)}
                {l.item_id && (
                  <>
                    {" "}
                    · tag <span className="font-mono">{l.item_id}</span>
                  </>
                )}
              </p>
              {l.status === "rejected" && l.reject_reason && (
                <p className="text-danger">Why: {l.reject_reason}</p>
              )}
              {l.sold_paise !== null && l.shop_share_paise !== null && (
                <p className="text-ink-soft">
                  Sold for {formatPrice(l.sold_paise)}. Your share,{" "}
                  {formatPrice(l.shop_share_paise)}, is paid after the 7-day return window
                  {l.payout_due_on ? ` (from ${day(l.payout_due_on)})` : ""}.
                </p>
              )}
              {(l.status === "submitted" || l.status === "at_hub") && (
                <div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void withdrawListing(l.id)
                        .then(reload)
                        .catch((e: unknown) =>
                          setError(e instanceof Error ? e.message : "That didn't work."),
                        )
                    }
                  >
                    Withdraw this listing
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ListingForm({ commissionPct, onSaved }: { commissionPct: number; onSaved: () => void }) {
  const [v, setV] = useState({
    type: "board",
    brand: "",
    model: "",
    description: "",
    ask: "",
    named: false,
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState<"idle" | "photo" | "saving">("idle");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) =>
    setV({ ...v, [k]: e.target.value });

  async function addPhoto(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy("photo");
    try {
      const next: string[] = [];
      for (const f of [...files].slice(0, 3 - photos.length)) next.push(await uploadPartPhoto(f));
      setPhotos([...photos, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The photo couldn't be saved.");
    } finally {
      setBusy("idle");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    const ask = Number(v.ask);
    if (!(ask >= 10 && ask <= 1_000_000))
      return setError("Enter your asking price in rupees (₹10 or more).");
    if (!v.named) return setError("Tick the box to agree to be named on the listing.");
    setBusy("saving");
    try {
      await submitListing({
        partType: v.type,
        brand: v.brand.trim(),
        model: v.model.trim(),
        description: v.description.trim(),
        askingPaise: Math.round(ask * 100),
        agreeNamed: v.named,
        photos,
      });
      setV({ type: "board", brand: "", model: "", description: "", ask: "", named: false });
      setPhotos([]);
      setDone(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That wasn't saved.");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mt-6 grid gap-4 rounded-card border border-line bg-surface p-5 sm:grid-cols-2"
    >
      <h2 className="text-xl font-bold sm:col-span-2">List a part</h2>
      <Field label="What is it?" required>
        <Select value={v.type} onChange={set("type")}>
          {EXCHANGE_PART_TYPES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Your asking price (₹)" required hint="What a buyer pays ReLoop for it.">
        <Input inputMode="decimal" value={v.ask} onChange={set("ask")} />
      </Field>
      <Field label="Brand">
        <Input value={v.brand} maxLength={40} onChange={set("brand")} />
      </Field>
      <Field label="Model">
        <Input value={v.model} maxLength={80} onChange={set("model")} />
      </Field>
      <Field label="What it fits and how you tested it" className="sm:col-span-2">
        <textarea
          value={v.description}
          maxLength={500}
          onChange={set("description")}
          className="min-h-20 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field
          label={`Photos (up to 3, JPG, PNG or WebP, 5 MB each): ${photos.length} added`}
          hint="Location and camera details are removed from your photos before they are stored."
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={photos.length >= 3 || busy !== "idle"}
            onChange={(e) => void addPhoto(e.target.files)}
          />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={v.named}
          onChange={(e) => setV({ ...v, named: e.target.checked })}
        />
        <span>
          Name my shop on the listing (&ldquo;Listed by my shop, my market&rdquo;). Buyers pay
          ReLoop, and ReLoop handles the 7-day return.
        </span>
      </label>
      <p className="text-sm text-muted sm:col-span-2">
        ReLoop records a {commissionPct}% commission when the part sells and pays you the rest after
        day 7, if it was not returned. Buyers never see the commission.
      </p>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={busy !== "idle"}>
          {busy === "saving"
            ? "Saving…"
            : busy === "photo"
              ? "Adding the photo…"
              : "Send this listing"}
        </Button>
        {done && (
          <span role="status" className="text-sm text-success">
            Sent. Bring the part on the next route day.
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm text-danger">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
