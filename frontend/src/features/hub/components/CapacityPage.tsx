"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Table, Td, Th } from "@/components/ui/Table";
import { BUSINESS_RULES } from "@/config/business-rules";
import {
  capacityStatus,
  listBatteryLines,
  logBattery,
  markBatteryReused,
  type BatteryLine,
  type Capacity,
} from "@/features/capacity/api";
import { binViews, capacityAlerts, conditionLabel } from "@/features/capacity/view";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { BIN_LABEL, type Bin } from "@/features/scrap/api";
import { cn } from "@/lib/utils/cn";
import { Field, Input, PageTitle, Panel, Select } from "./ui";

/** How full the hub is: scrap bins, the battery cabinet, device racks, the parts shelf and how old the stock is. */
export function CapacityPage() {
  return (
    <>
      <PageTitle
        title="Capacity"
        description={`Each scrap bin is handed to VRRG Group at ${BUSINESS_RULES.bins.handoverKg} kg or after ${BUSINESS_RULES.bins.handoverDays} days, with an alert from ${BUSINESS_RULES.bins.alertKg} kg. Batteries go every week. Racks and the parts shelf show what the hub is holding.`}
      />
      {SHARED_DATABASE ? (
        <Capacities />
      ) : (
        <p className="text-sm text-muted">Capacity is kept in the shared database.</p>
      )}
    </>
  );
}

function Capacities() {
  const [cap, setCap] = useState<Capacity | null>(null);
  const [lines, setLines] = useState<BatteryLine[]>([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    Promise.all([capacityStatus(), listBatteryLines()])
      .then(([c, l]) => {
        setCap(c);
        setLines(l);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Capacity didn't load."));
  }, [version]);

  if (error && !cap)
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  if (!cap)
    return (
      <p role="status" className="text-sm text-muted">
        Loading capacity…
      </p>
    );
  const alerts = capacityAlerts(cap);
  const rack = cap.device_rack;
  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <Notice tone="warning" role="status">
          <ul className="list-disc pl-5">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Notice>
      )}

      <Panel title="Scrap bins">
        <ul className="grid gap-3 sm:grid-cols-2">
          {binViews(cap).map((b) => (
            <li key={b.bin} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3 text-sm">
              <span>{BIN_LABEL[b.bin as Bin] ?? b.bin}</span>
              <span className="h-3 rounded-full bg-sunken" aria-hidden="true">
                <span
                  className={cn(
                    "block h-3 rounded-full",
                    b.level === "due"
                      ? "bg-danger"
                      : b.level === "alert"
                        ? "bg-gold-500"
                        : "bg-brand-600",
                  )}
                  style={{ width: `${b.fillPct}%` }}
                />
              </span>
              <span className="text-right tabular-nums">
                {b.kg} kg
                <span className="block text-xs text-muted">
                  {b.daysWaiting > 0 ? `${b.daysWaiting} d waiting` : "empty"}
                  {b.level === "due" && <span className="sr-only"> (handover due)</span>}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Device racks">
          {rack.slots ? (
            <>
              <p className="text-3xl font-bold tabular-nums">{rack.pct}%</p>
              <p className="text-sm text-muted">
                {rack.used} of {rack.slots} slots in use
                {rack.alert && " (80% or more)"}
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums">{rack.used}</p>
              <p className="text-sm text-muted">
                devices on the racks. The slots have not been counted yet: set{" "}
                <strong>capacity.device_rack_slots</strong> in Settings and this shows a percentage.
              </p>
            </>
          )}
        </Panel>
        <Panel title="Parts shelf">
          <p className="text-3xl font-bold tabular-nums">{cap.parts_shelf.count}</p>
          <p className="text-sm text-muted">tested parts on the shelf (a count, no limit)</p>
        </Panel>
        <Panel title="Age of stock">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Devices 0 to 30 days</dt>
              <dd className="tabular-nums">{cap.ages.devices.d0_30}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Devices 31 to 45 days</dt>
              <dd className="tabular-nums">{cap.ages.devices.d31_45}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Devices over 45 days</dt>
              <dd className="tabular-nums">{cap.ages.devices.d46_plus}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1">
              <dt>Parts 0 to 30 days</dt>
              <dd className="tabular-nums">{cap.ages.parts.d0_30}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Parts over 30 days</dt>
              <dd className="tabular-nums">{cap.ages.parts.d31_plus}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <BatteryCabinet cap={cap} lines={lines} onChanged={reload} />
    </div>
  );
}

function BatteryCabinet({
  cap,
  lines,
  onChanged,
}: {
  cap: Capacity;
  lines: BatteryLine[];
  onChanged: () => void;
}) {
  const [f, setF] = useState({ kg: "", count: "1", condition: "used", note: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await logBattery(Number(f.kg), Number(f.count), f.condition, f.note);
      setF({ kg: "", count: "1", condition: "used", note: "" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }
  async function reuse(id: number) {
    const where = window.prompt("Where was it reused? (a tag, or a short note)");
    if (!where) return;
    setError("");
    try {
      await markBatteryReused(id, where);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save.");
    }
  }

  return (
    <Panel title="Battery cabinet">
      <p className="text-sm text-muted">
        {Number(cap.battery.kg)} kg in {Number(cap.battery.count) || "an unknown number of"}{" "}
        batteries, handed over weekly
        {cap.battery.last_handover ? `. Last handover ${cap.battery.last_handover}` : ""}.
        {cap.battery.reminder && (
          <strong className="text-warning"> The weekly handover is due.</strong>
        )}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <form
        onSubmit={add}
        className="mt-4 grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_2fr_auto] sm:items-end"
      >
        <Field label="Weight (kg)" htmlFor="bat-kg">
          <Input
            id="bat-kg"
            inputMode="decimal"
            value={f.kg}
            onChange={(e) => setF({ ...f, kg: e.target.value })}
          />
        </Field>
        <Field label="Batteries" htmlFor="bat-count">
          <Input
            id="bat-count"
            inputMode="numeric"
            value={f.count}
            onChange={(e) => setF({ ...f, count: e.target.value })}
          />
        </Field>
        <Field label="Condition" htmlFor="bat-cond">
          <Select
            id="bat-cond"
            value={f.condition}
            onChange={(e) => setF({ ...f, condition: e.target.value })}
          >
            <option value="good">Good</option>
            <option value="used">Used</option>
            <option value="swollen">Swollen</option>
            <option value="damaged">Damaged</option>
          </Select>
        </Field>
        <Field label="Note" htmlFor="bat-note">
          <Input
            id="bat-note"
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
            maxLength={300}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          Log batteries
        </Button>
      </form>
      {lines.length > 0 && (
        <div className="mt-4">
          <Table caption="Battery cabinet entries">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th className="text-right">kg</Th>
                <Th className="text-right">Count</Th>
                <Th>Condition</Th>
                <Th>Note</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className={l.reused ? "text-muted" : undefined}>
                  <Td>{new Date(l.at).toLocaleDateString("en-IN")}</Td>
                  <Td className="text-right tabular-nums">{Number(l.kg)}</Td>
                  <Td className="text-right tabular-nums">{l.battery_count ?? "—"}</Td>
                  <Td>{conditionLabel(l.battery_condition)}</Td>
                  <Td>
                    {l.reused && Number(l.kg) > 0 ? "Reused. " : ""}
                    {l.note}
                  </Td>
                  <Td>
                    {!l.reused && Number(l.kg) > 0 && l.battery_condition === "good" && (
                      <Button size="sm" variant="secondary" onClick={() => void reuse(l.id)}>
                        Mark reused
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
