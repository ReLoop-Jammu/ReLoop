"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { BUSINESS_RULES } from "@/config/business-rules";
import { categoryLabel } from "@/features/inventory/model";
import { saveHandover } from "@/features/inventory/store";
import { formatPrice } from "@/lib/utils/money";
import { useHubData } from "../useHubData";
import { Field, Input, PageTitle, Panel, Select, rupeesToPaiseOrNull } from "./ui";

export function HandoversPage() {
  const { items, handovers, institutions, refresh } = useHubData();
  const cage = items.filter((i) => i.status === "in_scrap_cage");
  const cageKg = cage.reduce((s, i) => s + (i.weightKg ?? 0), 0);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const selected = picked ?? new Set(cage.map((i) => i.id));
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    recycler: "",
    onBehalfOf: "",
    receiptNo: "",
    totalKg: "",
    batteryKg: "",
    rate: "",
    amount: "",
    notes: "",
  });
  const [error, setError] = useState("");

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.recycler.trim() || !form.receiptNo.trim())
      return setError("Recycler name and receipt number are required.");
    const chosen = cage.filter((i) => selected.has(i.id));
    const kgByCategory: Record<string, number> = {};
    for (const i of chosen) {
      kgByCategory[i.category] = (kgByCategory[i.category] ?? 0) + (i.weightKg ?? 0);
    }
    const listedKg = Object.values(kgByCategory).reduce((a, b) => a + b, 0);
    const total = Number(form.totalKg || 0);
    if (total > listedKg) kgByCategory.unweighed = Number((total - listedKg).toFixed(2));
    await saveHandover({
      date: form.date,
      recycler: form.recycler.trim(),
      ...(form.onBehalfOf && { onBehalfOf: form.onBehalfOf }),
      kgByCategory,
      batteryKg: Number(form.batteryKg || 0),
      itemIds: chosen.map((i) => i.id),
      receiptNo: form.receiptNo.trim(),
      ...(rupeesToPaiseOrNull(form.rate) !== null && {
        ratePerKgPaise: rupeesToPaiseOrNull(form.rate)!,
      }),
      ...(rupeesToPaiseOrNull(form.amount) !== null && {
        amountPaise: rupeesToPaiseOrNull(form.amount)!,
      }),
      notes: form.notes,
    });
    setPicked(null);
    setError("");
    setForm((f) => ({
      ...f,
      receiptNo: "",
      totalKg: "",
      batteryKg: "",
      amount: "",
      notes: "",
      onBehalfOf: "",
    }));
    await refresh();
  };

  const totalKg = (h: (typeof handovers)[number]) =>
    Object.values(h.kgByCategory).reduce((a, b) => a + (b ?? 0), 0) + h.batteryKg;

  return (
    <>
      <PageTitle
        title="Recycler handovers"
        description={`Book a pickup when the cage reaches ${BUSINESS_RULES.scrapHandover.kgTrigger} kg or every ${BUSINESS_RULES.scrapHandover.daysTrigger} days. Batteries go every week.`}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Scrap cage: ${cage.length} items, ${cageKg.toFixed(1)} kg weighed`}>
          {cage.length === 0 ? (
            <p className="text-sm text-muted">The cage is empty.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-auto text-sm">
              {cage.map((i) => (
                <li key={i.id}>
                  <label className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selected.has(i.id)}
                      onChange={() => toggle(i.id)}
                    />
                    <span className="font-mono text-xs">{i.id}</span>
                    <span className="flex-1">
                      {categoryLabel(i.category)}{" "}
                      {i.hasBattery && <span className="text-xs text-grade-d">· battery</span>}
                    </span>
                    <span className="text-xs text-muted tabular-nums">
                      {i.weightKg ? `${i.weightKg} kg` : "not weighed"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Record a handover">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Recycler">
              <Input
                value={form.recycler}
                onChange={(e) => setForm({ ...form, recycler: e.target.value })}
                placeholder="Authorised recycler's name"
              />
            </Field>
            <Field label="Receipt number">
              <Input
                value={form.receiptNo}
                onChange={(e) => setForm({ ...form, receiptNo: e.target.value })}
              />
            </Field>
            <Field label="On behalf of (institution)">
              <Select
                value={form.onBehalfOf}
                onChange={(e) => setForm({ ...form, onBehalfOf: e.target.value })}
              >
                <option value="">ReLoop</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.name}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Total weight on receipt (kg)">
              <Input
                inputMode="decimal"
                value={form.totalKg}
                onChange={(e) => setForm({ ...form, totalKg: e.target.value })}
              />
            </Field>
            <Field label="Batteries (kg)">
              <Input
                inputMode="decimal"
                value={form.batteryKg}
                onChange={(e) => setForm({ ...form, batteryKg: e.target.value })}
              />
            </Field>
            <Field label="Rate per kg (₹)">
              <Input
                inputMode="decimal"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
            </Field>
            <Field label="Amount received (₹)">
              <Input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit" size="sm">
                Save handover ({selected.size} items)
              </Button>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
          </form>
        </Panel>
      </div>

      <Panel title="Handover log" className="mt-6 overflow-x-auto">
        {handovers.length === 0 ? (
          <p className="text-sm text-muted">No handovers yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  Date
                </th>
                <th scope="col" className="py-2 font-medium">
                  Recycler
                </th>
                <th scope="col" className="py-2 font-medium">
                  Receipt
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Items
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Total kg
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Batteries kg
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Received
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {handovers.map((h) => (
                <tr key={h.id}>
                  <td className="py-2">{h.date}</td>
                  <td className="py-2">
                    {h.recycler}
                    {h.onBehalfOf && (
                      <span className="block text-xs text-muted">for {h.onBehalfOf}</span>
                    )}
                  </td>
                  <td className="py-2">{h.receiptNo}</td>
                  <td className="py-2 text-right">{h.itemIds.length}</td>
                  <td className="py-2 text-right">{totalKg(h).toFixed(1)}</td>
                  <td className="py-2 text-right">{h.batteryKg.toFixed(1)}</td>
                  <td className="py-2 text-right">
                    {h.amountPaise ? formatPrice(h.amountPaise) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
