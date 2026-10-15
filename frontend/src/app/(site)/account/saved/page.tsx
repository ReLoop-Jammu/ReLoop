"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { RequireAccount } from "@/features/account/RequireAccount";
import {
  mySavedItems,
  unsaveItem,
  type MySavedItem,
  type SavedState,
} from "@/features/account/api";
import { categoryLabel, type Category } from "@/features/inventory/model";
import { formatPrice } from "@/lib/utils/money";

export default function MySavedPage() {
  return (
    <RequireAccount>
      {() => (
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>My ReLoop</Eyebrow>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Saved items</h1>
            <p className="mt-2 text-muted">
              Items you saved from the shop, with today&apos;s price. We&apos;ll let you know here
              (the bell at the top) when one drops in price, is reserved or sells. Saving
              doesn&apos;t hold an item: reserve it to do that.
            </p>
            <Saved />
          </div>
        </Container>
      )}
    </RequireAccount>
  );
}

const STATE: Record<SavedState, { label: string; tone: "success" | "info" | "neutral" }> = {
  on_sale: { label: "On sale", tone: "success" },
  reserved: { label: "Reserved by someone", tone: "info" },
  reserved_for_you: { label: "Reserved for you", tone: "success" },
  sold: { label: "Sold", tone: "neutral" },
  bought: { label: "You bought it", tone: "success" },
  unavailable: { label: "No longer in the shop", tone: "neutral" },
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Saved() {
  const [items, setItems] = useState<MySavedItem[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    mySavedItems()
      .then((r) => alive && setItems(r))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Couldn't load."));
    return () => {
      alive = false;
    };
  }, []);

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
  if (items.length === 0)
    return (
      <div className="mt-8 rounded-card border border-line bg-surface p-5 text-sm text-ink-soft">
        <p>
          Nothing saved yet. Press <strong>Save</strong> on any item in the shop to keep an eye on
          it.
        </p>
        <ButtonLink href="/shop" size="sm" variant="secondary" className="mt-3">
          Browse the shop
        </ButtonLink>
      </div>
    );
  return (
    <ul className="mt-8 grid gap-3">
      {items.map((i) => (
        <SavedRow
          key={i.item_id}
          item={i}
          onRemoved={() => setItems((xs) => xs?.filter((x) => x.item_id !== i.item_id) ?? null)}
        />
      ))}
    </ul>
  );
}

function SavedRow({ item: i, onRemoved }: { item: MySavedItem; onRemoved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const state = STATE[i.state];
  const live = i.state === "on_sale" || i.state === "reserved" || i.state === "reserved_for_you";
  // The shop shows only items on sale: a reserved item has no page.
  const linkable = i.state === "on_sale";
  const dropped =
    live && i.price_paise !== null && i.price_when_saved_paise !== null
      ? i.price_when_saved_paise - i.price_paise
      : 0;
  const name = i.title ?? categoryLabel(i.category as Category);
  return (
    <li className="rounded-card border border-line bg-surface p-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold">
          {linkable ? (
            <Link href={`/shop/${i.item_id}`} className="hover:text-brand-600 hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
          <span className="block font-mono text-xs font-normal text-muted">
            {i.item_id} · grade {i.grade}
          </span>
        </p>
        <StatusPill tone={state.tone}>{state.label}</StatusPill>
      </div>
      {live && i.price_paise !== null && (
        <p className="mt-2">
          <span className="font-display text-lg font-bold">{formatPrice(i.price_paise)}</span>
          {dropped > 0 && (
            <span className="ml-2 font-medium text-grade-a">
              {formatPrice(dropped)} less than when you saved it
            </span>
          )}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Saved {day(i.saved_at)}
          {i.state === "sold" && (
            <>
              {" · "}
              <Link
                href={`/shop?category=${i.category}`}
                className="font-semibold text-brand-600 underline"
              >
                Similar items
              </Link>
            </>
          )}
          {i.state === "bought" && (
            <>
              {" · "}
              <Link href="/account/warranty" className="font-semibold text-brand-600 underline">
                Its warranty
              </Link>
            </>
          )}
        </p>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            unsaveItem(i.item_id)
              .then(onRemoved)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : "That didn't work."))
              .finally(() => setBusy(false));
          }}
        >
          Remove<span className="sr-only"> {name}</span>
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
