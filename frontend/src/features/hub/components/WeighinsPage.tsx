"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { useSiteSettings } from "@/features/settings/context";
import {
  listWeighins,
  markReceiptShared,
  payTestedParts,
  receiptWhatsappUrl,
  recordWeighin,
  type Receipt,
  type Weighin,
} from "@/features/scrap/api";
import { formatPrice } from "@/lib/utils/money";
import { useHubData } from "../useHubData";
import { Field, Input, PageTitle, Panel, Select } from "./ui";

/** Weigh a partner's scrap at the counter, pay by the rate card, and share the receipt. */
export function WeighinsPage() {
  return (
    <>
      <PageTitle
        title="Weigh-ins"
        description="Weigh the shop's scrap by category in front of them, pay by UPI at the rate card, and give them a numbered receipt. Likely-working parts go in the to-test bag, with no money yet."
      />
      {SHARED_DATABASE ? (
        <Suspense fallback={null}>
          <WeighIns />
        </Suspense>
      ) : (
        <p className="text-sm text-muted">Weigh-ins are kept in the shared database.</p>
      )}
    </>
  );
}

const kg = (n: number | string) => Number(n).toFixed(1);

function WeighIns() {
  const { partners } = useHubData();
  const site = useSiteSettings();
  const active = partners.filter((p) => p.status === "active");
  const [list, setList] = useState<Weighin[] | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    listWeighins()
      .then(setList)
      .catch(() => setList([]));
  }, [version]);

  // The route sheet links here with the stop's partner already chosen.
  const preset = useSearchParams().get("partner") ?? "";
  const [f, setF] = useState({
    partnerId: preset,
    screens: "",
    boards: "",
    batteries: "",
    other: "",
    toTest: "0",
    toTestNote: "",
    owns: false,
    swap: false,
    method: "upi" as "upi" | "cash",
    reference: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<(Receipt & { phone: string; shop: string }) | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const num = (s: string) => (s.trim() === "" ? 0 : Number(s));
  const amountPaise = Math.round(
    num(f.screens) * site.rateScreensPaise +
      num(f.boards) * site.rateBoardsPaise +
      num(f.batteries) * site.rateBatteriesPaise +
      num(f.other) * site.rateOtherPaise,
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setReceipt(null);
    const kgs = [f.screens, f.boards, f.batteries, f.other].map(num);
    if (!f.partnerId) return setError("Choose the partner shop.");
    if (kgs.some((n) => !Number.isFinite(n) || n < 0 || n > 5000))
      return setError("Weights are between 0 and 5,000 kg.");
    const toTest = Math.round(num(f.toTest));
    if (kgs.every((n) => n === 0) && toTest === 0)
      return setError("Enter a weight or a to-test count.");
    if (!f.owns) return setError("The shop must confirm the scrap is theirs to sell.");
    if (toTest > 0 && !f.swap)
      return setError("The shop must confirm it may sell the parts left to test.");
    setBusy(true);
    try {
      const r = await recordWeighin({
        partnerId: f.partnerId,
        screensKg: kgs[0],
        boardsKg: kgs[1],
        batteriesKg: kgs[2],
        otherKg: kgs[3],
        toTestCount: toTest,
        toTestNote: f.toTestNote,
        ownerConfirmed: f.owns,
        swapDeclaration: f.swap,
        method: f.method,
        reference: f.reference,
      });
      const p = partners.find((x) => x.id === f.partnerId);
      setReceipt({ ...r, phone: p?.phone ?? "", shop: p?.name ?? "" });
      setF({
        ...f,
        screens: "",
        boards: "",
        batteries: "",
        other: "",
        toTest: "0",
        toTestNote: "",
        owns: false,
        swap: false,
        reference: "",
      });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That weigh-in wasn't saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel title="New weigh-in">
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Partner shop" className="lg:col-span-2" required>
            <Select value={f.partnerId} onChange={set("partnerId")}>
              <option value="">Choose…</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.market || "no market"})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Screens and displays (kg)">
            <Input inputMode="decimal" value={f.screens} onChange={set("screens")} />
          </Field>
          <Field label="Dead motherboards (kg)">
            <Input inputMode="decimal" value={f.boards} onChange={set("boards")} />
          </Field>
          <Field label="Batteries (kg)">
            <Input inputMode="decimal" value={f.batteries} onChange={set("batteries")} />
          </Field>
          <Field label="Everything else (kg)">
            <Input inputMode="decimal" value={f.other} onChange={set("other")} />
          </Field>
          <Field label="Items in the to-test bag">
            <Input inputMode="numeric" value={f.toTest} onChange={set("toTest")} />
          </Field>
          <Field label="Bag note" className="lg:col-span-2">
            <Input value={f.toTestNote} maxLength={300} onChange={set("toTestNote")} />
          </Field>
          <Field label="Paid by">
            <Select value={f.method} onChange={set("method")}>
              <option value="upi">UPI</option>
              <option value="cash">Cash (exception)</option>
            </Select>
          </Field>
          <Field label="UPI reference (staff only)" className="lg:col-span-2">
            <Input value={f.reference} maxLength={80} onChange={set("reference")} />
          </Field>
          <div className="grid content-end gap-2 text-sm sm:col-span-2 lg:col-span-4">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={f.owns}
                onChange={(e) => setF({ ...f, owns: e.target.checked })}
              />
              <span>
                The shop confirms the scrap is theirs to sell (recorded with you as the staff member
                present).
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={f.swap}
                onChange={(e) => setF({ ...f, swap: e.target.checked })}
              />
              <span>The shop confirms it may sell the swapped parts left in the to-test bag.</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <p className="text-sm">
              Pay now: <strong className="tabular-nums">{formatPrice(amountPaise)}</strong>{" "}
              <span className="text-muted">
                (at the rate card; the counter weight is the paid weight)
              </span>
            </p>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving…" : "Record and pay"}
            </Button>
            {error && (
              <span role="alert" className="text-sm text-danger">
                {error}
              </span>
            )}
          </div>
        </form>
        {receipt && (
          <Notice tone="success" role="status" className="mt-4" title="Weigh-in recorded">
            {receipt.receiptNo ? (
              <>
                Receipt <span className="font-mono">{receipt.receiptNo}</span>,{" "}
                {formatPrice(receipt.amountPaise)}.{" "}
                {receipt.token && (
                  <>
                    <a
                      className="font-semibold underline"
                      href={receiptWhatsappUrl(
                        receipt.phone,
                        receipt.token,
                        window.location.origin,
                        receipt.receiptNo,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => void markReceiptShared(receipt.receiptNo!)}
                    >
                      Share on WhatsApp
                    </a>{" "}
                    ·{" "}
                    <a
                      className="font-semibold underline"
                      href={`/receipt/${receipt.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open the receipt
                    </a>
                  </>
                )}
              </>
            ) : (
              <>Nothing to pay yet: the to-test bag is logged under {receipt.shop}.</>
            )}
          </Notice>
        )}
      </Panel>

      <PayParts weighins={(list ?? []).filter((w) => w.to_test_count > 0)} onPaid={reload} />

      <Panel title="Recent weigh-ins" className="mt-6 overflow-x-auto">
        {list === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted">No weigh-ins yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  Date
                </th>
                <th scope="col" className="py-2 font-medium">
                  Shop
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Screens
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Boards
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Batteries
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Other
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Paid
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  To test
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {list.slice(0, 40).map((w) => (
                <tr key={w.id}>
                  <td className="py-2">{new Date(w.weighed_at).toLocaleDateString("en-IN")}</td>
                  <td className="py-2">
                    {partners.find((p) => p.id === w.partner_id)?.name ?? "Deleted"}
                  </td>
                  <td className="py-2 text-right">{kg(w.screens_kg)}</td>
                  <td className="py-2 text-right">{kg(w.boards_kg)}</td>
                  <td className="py-2 text-right">{kg(w.batteries_kg)}</td>
                  <td className="py-2 text-right">{kg(w.other_kg)}</td>
                  <td className="py-2 text-right">{formatPrice(Number(w.amount_paise))}</td>
                  <td className="py-2 text-right">{w.to_test_count || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

/** Step two of a split lot: pay for the tested working parts of a weigh-in at their part price. */
function PayParts({ weighins, onPaid }: { weighins: Weighin[]; onPaid: () => void }) {
  const { partners } = useHubData();
  const [id, setId] = useState("");
  const [tags, setTags] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  if (weighins.length === 0) return null;
  async function pay(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const items = tags
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (!id || items.length === 0) return setError("Choose the weigh-in and enter the part tags.");
    try {
      const [r] = await payTestedParts(id, items);
      setMsg(`Paid ${formatPrice(Number(r.amount_paise))} on receipt ${r.receipt_no}.`);
      setTags("");
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That wasn't paid.");
    }
  }
  return (
    <Panel title="Pay for tested parts" className="mt-6">
      <p className="mb-3 text-sm text-muted">
        Within 24 hours of a weigh-in, tag each tested working part at intake (choose the weigh-in
        there), set its part price, then pay for them here on their own receipt line.
      </p>
      <form onSubmit={pay} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Weigh-in with a bag">
          <Select value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Choose…</option>
            {weighins.map((w) => (
              <option key={w.id} value={w.id}>
                {new Date(w.weighed_at).toLocaleDateString("en-IN")} ·{" "}
                {partners.find((p) => p.id === w.partner_id)?.name ?? "Deleted"} · {w.to_test_count}{" "}
                to test
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Part tags (RL-JMU-…)">
          <Input value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Pay for these parts
          </Button>
        </div>
      </form>
      {msg && (
        <p role="status" className="mt-2 text-sm text-success">
          {msg}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Panel>
  );
}
