"use client";

import Link from "next/link";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useAccount } from "@/lib/use-account";
import { SHOP_CONDITIONS } from "@/lib/validation";
import { inputClass } from "./RequestForm";

type ItemDraft = {
  itemName: string;
  category: string;
  brand: string;
  model: string;
  condition: string;
  quantity: string;
  askingPrice: string;
  imageUrl: string;
  description: string;
};

const emptyItem = (): ItemDraft => ({
  itemName: "",
  category: "",
  brand: "",
  model: "",
  condition: SHOP_CONDITIONS[0],
  quantity: "1",
  askingPrice: "",
  imageUrl: "",
  description: "",
});

const categories = [
  "Phones & tablets",
  "Laptops",
  "Desktops",
  "Monitors",
  "Printers",
  "Accessories & parts",
  "Other electronics",
];

const linkButton =
  "inline-flex min-h-11 items-center rounded-full px-5 font-semibold";

export function ShopSubmissionForm() {
  const { account, loading } = useAccount();
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const updateItem = (index: number, field: keyof ItemDraft, value: string) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const invalid = items.some(
      (item) =>
        !item.itemName.trim() ||
        !item.condition ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1,
    );
    if (invalid) {
      setError("For every item, enter a name, condition and quantity of at least 1.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/shop-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, website }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        count?: number;
        error?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "We couldn't submit your items.");
      }
      setSuccessCount(result.count ?? items.length);
      setItems([emptyItem()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-muted">Loading…</p>;

  if (!account) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">Log in to submit items</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Shop submissions are available to registered shop owners after ReLoop verifies their
          business and GSTIN.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className={`${linkButton} bg-brand-600 text-white`}
            href="/login?next=/sell/shops"
          >
            Log in
          </Link>
          <Link className={`${linkButton} border border-line`} href="/register">
            Register as a shop owner
          </Link>
        </div>
      </div>
    );
  }

  if (account.profile?.role !== "shop_owner") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">Shop-owner accounts only</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          You&apos;re signed in with a buyer account. To submit stock, register a separate
          shop-owner account with your business details.
        </p>
      </div>
    );
  }

  if (account.shop?.verification_status !== "verified") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h3 className="text-xl font-bold text-ink">Your shop is awaiting verification</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          ReLoop checks every shop&apos;s business details and GSTIN before it can submit items.
          Status: <strong>{account.shop?.verification_status ?? "pending"}</strong>. We&apos;ll
          contact you once it&apos;s reviewed.
        </p>
        <Link
          className={`${linkButton} mt-5 border border-line`}
          href="/account"
        >
          View my account
        </Link>
      </div>
    );
  }

  if (successCount !== null) {
    return (
      <div
        className="rounded-2xl border border-grade-a/30 bg-grade-a-bg p-6 sm:p-8"
        role="status"
        aria-live="polite"
      >
        <h3 className="text-xl font-bold text-ink">Your items have been submitted</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Thank you. ReLoop has received {successCount} item{" "}
          {successCount === 1 ? "entry" : "entries"} for review. These are private submissions, not
          public shop listings. Our team will contact you about the next steps.
        </p>
        <Button className="mt-5" type="button" onClick={() => setSuccessCount(null)}>
          Submit another lot
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-ink">Submitting as</h3>
        <p className="mt-1 text-sm text-muted">
          <strong>{account.shop?.shop_name}</strong> · {account.profile.full_name}. We use the phone
          number and address on your verified account to contact you.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">Items you want to sell to ReLoop</h3>
            <p className="mt-1 text-sm text-muted">
              Add up to 10 different items in one submission. Quantity can be more than one.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={items.length >= 10}
            onClick={() => setItems((current) => [...current, emptyItem()])}
          >
            <Plus className="mr-1 size-4" aria-hidden="true" /> Add item
          </Button>
        </div>

        {items.map((item, index) => (
          <fieldset key={index} className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <legend className="font-semibold text-ink">Item {index + 1}</legend>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Remove
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item name *">
                <input
                  className={inputClass}
                  required
                  maxLength={120}
                  placeholder="e.g. Samsung Galaxy phone"
                  value={item.itemName}
                  onChange={(e) => updateItem(index, "itemName", e.target.value)}
                />
              </Field>
              <Field label="Category">
                <select
                  className={inputClass}
                  value={item.category}
                  onChange={(e) => updateItem(index, "category", e.target.value)}
                >
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Brand">
                <input
                  className={inputClass}
                  maxLength={100}
                  placeholder="e.g. Samsung"
                  value={item.brand}
                  onChange={(e) => updateItem(index, "brand", e.target.value)}
                />
              </Field>
              <Field label="Model">
                <input
                  className={inputClass}
                  maxLength={100}
                  placeholder="e.g. Galaxy A52"
                  value={item.model}
                  onChange={(e) => updateItem(index, "model", e.target.value)}
                />
              </Field>
              <Field label="Condition *">
                <select
                  className={inputClass}
                  required
                  value={item.condition}
                  onChange={(e) => updateItem(index, "condition", e.target.value)}
                >
                  {SHOP_CONDITIONS.map((condition) => (
                    <option key={condition}>{condition}</option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity *">
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  required
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                />
              </Field>
              <Field label="Expected price per item (₹, optional)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Your asking price"
                  value={item.askingPrice}
                  onChange={(e) => updateItem(index, "askingPrice", e.target.value)}
                />
              </Field>
              <Field label="Photo link (optional, https only)">
                <input
                  className={inputClass}
                  type="url"
                  maxLength={1000}
                  placeholder="https://…"
                  value={item.imageUrl}
                  onChange={(e) => updateItem(index, "imageUrl", e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Additional details (optional)">
                  <textarea
                    className={`${inputClass} min-h-24 py-3`}
                    maxLength={800}
                    placeholder="Working status, accessories, faults, lot details…"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </fieldset>
        ))}
      </section>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="shop-website">Website</label>
        <input
          id="shop-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="rounded-xl bg-sunken p-4 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">What happens after you submit?</p>
        <p className="mt-1">
          Your details go privately to ReLoop for review. Submission does not guarantee purchase
          and will not publish anything on the public marketplace. Our team will contact you to
          discuss inspection and pricing.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={busy}>
        {busy ? (
          "Submitting items…"
        ) : (
          <>
            <UploadCloud className="mr-2 size-4" aria-hidden="true" /> Submit items to ReLoop
          </>
        )}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  );
}
