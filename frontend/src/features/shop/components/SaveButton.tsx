"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { isSaved, saveItem, unsaveItem } from "@/features/account/api";
import { loginHref } from "@/lib/auth-client";
import { useAccess } from "@/lib/use-access";
import { cn } from "@/lib/utils/cn";

/**
 * Saves the item to the signed-in person's account, where they see its price
 * and status and get a notification when it drops in price, is reserved or
 * sells. Visitors are sent to log in and brought back here.
 */
export function SaveButton({ itemId }: { itemId: string }) {
  const a = useAccess();
  const pathname = usePathname();
  const signedIn = a.state === "ready" && a.access !== null;
  const [saved, setSaved] = useState<{ id: string; on: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    isSaved(itemId)
      .then((on) => alive && setSaved({ id: itemId, on }))
      .catch(() => alive && setSaved({ id: itemId, on: false }));
    return () => {
      alive = false;
    };
  }, [signedIn, itemId]);
  const classes = (on: boolean) =>
    buttonClasses({ size: "sm", variant: on ? "secondary" : "ghost" });
  const icon = (on: boolean) => (
    <Heart className={cn("size-4", on && "fill-current")} aria-hidden="true" />
  );

  if (a.state === "ready" && !a.access)
    return (
      <p role="status" className="text-sm text-muted">
        Couldn&apos;t check your account. Reload the page to save this item.
      </p>
    );
  if (a.state === "signed-out")
    return (
      <Link href={loginHref(pathname)} className={classes(false)}>
        {icon(false)} Save
        <span className="sr-only"> (log in first)</span>
      </Link>
    );
  const on = saved?.id === itemId && saved.on;
  const known = saved?.id === itemId;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        aria-pressed={on}
        disabled={!known || busy}
        onClick={() => {
          setBusy(true);
          setError("");
          (on ? unsaveItem(itemId) : saveItem(itemId))
            .then(() => setSaved({ id: itemId, on: !on }))
            .catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "That didn't work. Please try again."),
            )
            .finally(() => setBusy(false));
        }}
        className={classes(on)}
      >
        {icon(on)}
        {on ? "Saved" : "Save"}
      </button>
      {on && (
        <Link href="/account/saved" className="font-semibold text-brand-600 underline">
          Your saved items
        </Link>
      )}
      {error && (
        <span role="alert" className="text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
