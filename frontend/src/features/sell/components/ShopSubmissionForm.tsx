"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  condition: "Working",
  quantity: "1",
  askingPrice: "",
  imageUrl: "",
  description: "",
});

const categories = ["Phones & tablets", "Laptops", "Desktops", "Monitors", "Printers", "Accessories & parts", "Other electronics"];

export function ShopSubmissionForm() {
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Jammu");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const updateItem = (index: number, field: keyof ItemDraft, value: string) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (items.some((item) => !item.itemName.trim() || !item.condition || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
      setError("For every item, enter a name, condition and quantity of at least 1.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/shop-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, ownerName, phone, email, address, city, items, website }),
      });
      const result = (await response.json()) as { ok?: boolean; count?: number; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "We couldn't submit your items.");
      setSuccessCount(result.count ?? items.length);
      setItems([emptyItem()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (successCount !== null) {
    return (
      <div className="rounded-2xl border border-grade-a/30 bg-grade-a-bg p-6 sm:p-8" role="status" aria-live="polite">
        <h3 className="text-xl font-bold text-ink">Your items have been submitted</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Thank you. ReLoop has received {successCount} item {successCount === 1 ? "entry" : "entries"} for review. These are private submissions, not public shop listings. Our team will contact you about the next steps.
        </p>
        <Button className="mt-5" type="button" onClick={() => setSuccessCount(null)}>Submit another lot</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-ink">Shop and contact details</h3>
        <p className="mt-1 text-sm text-muted">We use these details to contact you about your items.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Shop name *"><input className={inputClass} required maxLength={120} value={shopName} onChange={(e) => setShopName(e.target.value)} autoComplete="organization" /></Field>
          <Field label="Your name *"><input className={inputClass} required maxLength={120} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="name" /></Field>
          <Field label="Phone / WhatsApp *"><input className={inputClass} required type="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></Field>
          <Field label="Email (optional)"><input className={inputClass} type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Shop address (optional)"><input className={inputClass} maxLength={240} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" /></Field>
          <Field label="City"><input className={inputClass} maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">Items you want to sell to ReLoop</h3>
            <p className="mt-1 text-sm text-muted">Add up to 10 different items in one submission. Quantity can be more than one.</p>
          </div>
          <Button type="button" variant="secondary" disabled={items.length >= 10} onClick={() => setItems((current) => [...current, emptyItem()])}>
            <Plus className="mr-1 size-4" aria-hidden="true" /> Add item
          </Button>
        </div>

        {items.map((item, index) => (
          <fieldset key={index} className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <legend className="font-semibold text-ink">Item {index + 1}</legend>
              {items.length > 1 && <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-danger hover:bg-danger/10"><Trash2 className="size-4" /> Remove</button>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item name *"><input className={inputClass} required maxLength={120} placeholder="e.g. Samsung Galaxy phone" value={item.itemName} onChange={(e) => updateItem(index, "itemName", e.target.value)} /></Field>
              <Field label="Category"><select className={inputClass} value={item.category} onChange={(e) => updateItem(index, "category", e.target.value)}><option value="">Choose category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
              <Field label="Brand"><input className={inputClass} maxLength={100} value={item.brand} onChange={(e) => updateItem(index, "brand", e.target.value)} placeholder="e.g. Samsung" /></Field>
              <Field label="Model"><input className={inputClass} maxLength={100} value={item.model} onChange={(e) => updateItem(index, "model", e.target.value)} placeholder="e.g. Galaxy A52" /></Field>
              <Field label="Condition *"><select className={inputClass} required value={item.condition} onChange={(e) => updateItem(index, "condition", e.target.value)}><option>Working</option><option>Partially working</option><option>Broken</option><option>Dead / scrap</option><option>Untested</option></select></Field>
              <Field label="Quantity *"><input className={inputClass} type="number" min="1" max="100000" step="1" required value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} /></Field>
              <Field label="Expected price per item (₹, optional)"><input className={inputClass} type="number" min="0" step="0.01" value={item.askingPrice} onChange={(e) => updateItem(index, "askingPrice", e.target.value)} placeholder="Your asking price" /></Field>
              <Field label="Photo URL (optional)"><input className={inputClass} type="url" maxLength={1000} value={item.imageUrl} onChange={(e) => updateItem(index, "imageUrl", e.target.value)} placeholder="https://…" /></Field>
              <div className="sm:col-span-2"><Field label="Additional details (optional)"><textarea className={`${inputClass} min-h-24 py-3`} maxLength={800} value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} placeholder="Working status, accessories, faults, lot details…" /></Field></div>
            </div>
          </fieldset>
        ))}
      </section>

      <div className="hidden" aria-hidden="true"><label htmlFor="shop-website">Website</label><input id="shop-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
      <div className="rounded-xl bg-sunken p-4 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">What happens after you submit?</p>
        <p className="mt-1">Your details go privately to ReLoop for review. Submission does not guarantee purchase and will not publish anything on the public marketplace. Our team will contact you to discuss inspection and pricing.</p>
      </div>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Submitting items…" : <><UploadCloud className="mr-2 size-4" aria-hidden="true" /> Submit items to ReLoop</>}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-ink">{label}{children}</label>;
}
