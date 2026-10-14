"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { Item } from "@/features/inventory/model";
import {
  editItemDetails,
  markReturned,
  saveItem,
  setHidden,
  setItemStatus,
} from "@/features/inventory/store";
import { Field, Input, Panel, hubInput } from "./ui";

/**
 * After intake: hide an item from the public shop, correct its details (with
 * a reason for the history), record a return and decide what happens next.
 */
export function ListingControls({
  item,
  onChanged,
}: {
  item: Item;
  onChanged: (msg: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"idle" | "edit" | "return">("idle");
  const [details, setDetails] = useState({
    brand: item.brand,
    model: item.model,
    description: item.description,
  });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(work: () => Promise<unknown>, msg: string) {
    setBusy(true);
    setError("");
    try {
      await work();
      setMode("idle");
      setReason("");
      await onChanged(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }
  const sellable =
    (item.grade === "A" || item.grade === "B" || item.category === "part") &&
    Boolean(item.currentPaise);
  const wiped = !item.dataWipe.required || Boolean(item.dataWipe.doneAt);

  return (
    <Panel title="Listing controls">
      <div className="grid gap-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2">
            {item.hidden ? (
              <>
                <EyeOff className="size-4 text-warning" aria-hidden="true" />
                <span>
                  <strong>Hidden</strong> from the public shop and every public page.
                </span>
              </>
            ) : (
              <>
                <Eye className="size-4 text-success" aria-hidden="true" />
                <span>Shown in the public shop whenever it is listed or reserved.</span>
              </>
            )}
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(
                () => setHidden(item.id, !item.hidden),
                item.hidden
                  ? "The item is shown again."
                  : "The item is hidden from the public site.",
              )
            }
          >
            {item.hidden ? "Show in the shop" : "Hide from the shop"}
          </Button>
        </div>

        {mode === "idle" && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode("edit")}>
              Edit brand, model or description…
            </Button>
            {item.status === "sold" && (
              <Button size="sm" variant="ghost" onClick={() => setMode("return")}>
                The buyer returned it…
              </Button>
            )}
          </div>
        )}

        {mode === "edit" && (
          <form
            className="grid gap-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void run(() => editItemDetails(item.id, details, reason), "Details corrected.");
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Brand" htmlFor={`${item.id}-brand`}>
                <Input
                  id={`${item.id}-brand`}
                  value={details.brand}
                  maxLength={40}
                  onChange={(e) => setDetails({ ...details, brand: e.target.value })}
                />
              </Field>
              <Field label="Model" htmlFor={`${item.id}-model`}>
                <Input
                  id={`${item.id}-model`}
                  value={details.model}
                  maxLength={80}
                  onChange={(e) => setDetails({ ...details, model: e.target.value })}
                />
              </Field>
            </div>
            <label className="grid gap-1 text-xs font-medium" htmlFor={`${item.id}-desc`}>
              Description
              <textarea
                id={`${item.id}-desc`}
                className={`${hubInput} min-h-20 py-2`}
                value={details.description}
                maxLength={2000}
                onChange={(e) => setDetails({ ...details, description: e.target.value })}
              />
            </label>
            <Field label="Why the change (goes into the history)" htmlFor={`${item.id}-reason`}>
              <Input
                id={`${item.id}-reason`}
                value={reason}
                maxLength={300}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save the correction"}
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setMode("idle")}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {mode === "return" && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void run(
                () => markReturned(item.id, reason),
                "Return recorded. Decide where it goes next.",
              );
            }}
          >
            <label className="grid min-w-64 flex-1 gap-1 text-xs font-medium">
              What happened (for example a warranty claim)
              <input
                className={hubInput}
                value={reason}
                maxLength={300}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button size="sm" type="submit" disabled={busy}>
              Record the return
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </form>
        )}

        {item.status === "returned" && (
          <div className="grid gap-2 rounded-lg bg-sunken p-3">
            <p>
              Returned
              {item.returnedAt && ` on ${new Date(item.returnedAt).toLocaleDateString("en-IN")}`}.
              Test it again (regrade above if needed), then:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy || !sellable || !wiped}
                onClick={() =>
                  void run(
                    // A fresh listing date: the day-45 and day-75 clocks start again.
                    () =>
                      saveItem({ ...item, status: "listed", listedAt: new Date().toISOString() }),
                    "Back on sale.",
                  )
                }
              >
                Put it back on sale
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => setItemStatus(item.id, "in_scrap_cage", "Returned item, not resellable"),
                    "Sent to the scrap cage.",
                  )
                }
              >
                Send it to the scrap cage
              </Button>
            </div>
            {(!sellable || !wiped) && (
              <p className="text-xs text-muted">
                To sell it again it needs grade A or B (or to be a part), a price and a recorded
                data wipe.
              </p>
            )}
          </div>
        )}

        <NewPrice item={item} onSaved={onChanged} />

        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
}

/** The price of the item new, for "about ₹X less than new" on its shop page (with where and when). */
function NewPrice({ item, onSaved }: { item: Item; onSaved: (msg: string) => Promise<void> }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [price, setPrice] = useState(item.newPricePaise ? String(item.newPricePaise / 100) : "");
  const [source, setSource] = useState(item.newPriceSource ?? "");
  const [checked, setChecked] = useState(item.newPriceCheckedOn ?? today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function save(e: FormEvent) {
    e.preventDefault();
    const paise = price.trim() === "" ? undefined : Math.round(Number(price) * 100);
    if (paise !== undefined && (!Number.isFinite(paise) || paise <= 0))
      return setError("Enter the price new in rupees.");
    if (paise !== undefined && source.trim().length < 3)
      return setError("Say where you found the price new.");
    setBusy(true);
    setError("");
    saveItem({
      ...item,
      newPricePaise: paise,
      newPriceSource: paise === undefined ? undefined : source.trim(),
      newPriceCheckedOn: paise === undefined ? undefined : checked,
    })
      .then(() => onSaved(paise === undefined ? "Price new removed." : "Price new saved."))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "That wasn't saved."))
      .finally(() => setBusy(false));
  }
  return (
    <form
      className="grid gap-2 border-t border-line pt-4 sm:grid-cols-[8rem_1fr_9rem_auto] sm:items-end"
      onSubmit={save}
      noValidate
    >
      <label className="grid gap-1 text-xs font-medium">
        Price new (₹)
        <input
          className={hubInput}
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        Where (shown on the shop page)
        <input
          className={hubInput}
          value={source}
          maxLength={200}
          placeholder="For example: brand's India store"
          onChange={(e) => setSource(e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium">
        Checked on
        <input
          className={hubInput}
          type="date"
          max={today}
          value={checked}
          onChange={(e) => setChecked(e.target.value)}
        />
      </label>
      <Button size="sm" type="submit" disabled={busy}>
        Save price new
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger sm:col-span-4">
          {error}
        </p>
      )}
    </form>
  );
}
