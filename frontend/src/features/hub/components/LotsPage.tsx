"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { allPages } from "@/lib/pages";
import { call, rpc } from "@/lib/rpc";
import { formatPrice } from "@/lib/utils/money";
import { useHubData } from "../useHubData";
import { Field, Input, PageTitle, Panel, Select } from "./ui";

type Lot = {
  id: string;
  institution_id: string;
  lot_date: string;
  fee_paise: number;
  fee_receipt_no: string | null;
  fee_received_at: string | null;
  handover_id: string | null;
};

const loadLots = () =>
  allPages((headers) =>
    call<Lot[]>(
      "institution_lots?select=id,institution_id,lot_date,fee_paise,fee_receipt_no,fee_received_at,handover_id&order=lot_date.desc",
      { headers },
    ),
  );

export function LotsPage() {
  return (
    <>
      <PageTitle
        title="Institution lots"
        description="Colleges, schools, banks and offices: sort on site, buy the working and repairable equipment on its own receipt, charge the lot fee on its own receipt, and send dead e-waste straight to VRRG Group on their weight receipt in the institution's name. Printers, UPS units, TVs and small appliances are never bought or carried."
      />
      {SHARED_DATABASE ? (
        <Lots />
      ) : (
        <p className="text-sm text-muted">Institution lots are kept in the shared database.</p>
      )}
    </>
  );
}

function Lots() {
  const { institutions } = useHubData();
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [inst, setInst] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Record<string, string>>({});
  const [kgs, setKgs] = useState<
    Record<string, { screens: string; boards: string; other: string }>
  >({});
  const reload = useCallback(() => {
    loadLots()
      .then(setLots)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load."));
  }, []);
  useEffect(reload, [reload]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setError("");
    setMsg("");
    try {
      await fn();
      setMsg(done);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    }
  };

  async function open(e: FormEvent) {
    e.preventDefault();
    if (!inst) return setError("Choose the institution.");
    await run(() => rpc("open_institution_lot", { p_institution: inst }), "Lot opened.");
  }

  return (
    <>
      {error && (
        <Notice tone="danger" role="alert" className="mb-4">
          {error}
        </Notice>
      )}
      {msg && (
        <Notice tone="success" role="status" className="mb-4">
          {msg}
        </Notice>
      )}
      <Panel title="Open a lot">
        <form onSubmit={open} className="flex flex-wrap items-end gap-3">
          <Field label="Institution">
            <Select value={inst} onChange={(e) => setInst(e.target.value)}>
              <option value="">Choose…</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" size="sm">
            Open the lot
          </Button>
        </form>
      </Panel>

      <Panel title="Lots" className="mt-6">
        {lots === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : lots.length === 0 ? (
          <p className="text-sm text-muted">No lots yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {lots.map((l) => {
              const k = kgs[l.id] ?? { screens: "", boards: "", other: "" };
              const setK = (key: keyof typeof k, v: string) =>
                setKgs({ ...kgs, [l.id]: { ...k, [key]: v } });
              return (
                <li key={l.id} className="grid gap-2 py-3">
                  <p className="font-semibold">
                    {institutions.find((i) => i.id === l.institution_id)?.name ?? "Institution"} ·{" "}
                    {new Date(l.lot_date).toLocaleDateString("en-IN")} · fee{" "}
                    {formatPrice(Number(l.fee_paise))}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {l.fee_receipt_no ? (
                      <span className="text-success">
                        Fee received, receipt <span className="font-mono">{l.fee_receipt_no}</span>
                      </span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            void run(
                              () => rpc("record_lot_fee", { p_lot: l.id, p_method: "upi" }),
                              "Fee recorded.",
                            )
                          }
                        >
                          Fee received by UPI
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void run(
                              () => rpc("record_lot_fee", { p_lot: l.id, p_method: "cash" }),
                              "Fee recorded.",
                            )
                          }
                        >
                          Fee received in cash
                        </Button>
                      </>
                    )}
                  </div>
                  {l.handover_id ? (
                    <p className="text-success">
                      Dead e-waste handed to VRRG Group on its weight receipt.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                      <Input
                        aria-label="VRRG weight receipt number"
                        placeholder="VRRG receipt no."
                        value={receipt[l.id] ?? ""}
                        onChange={(e) => setReceipt({ ...receipt, [l.id]: e.target.value })}
                      />
                      <Input
                        aria-label="Screens kg"
                        inputMode="decimal"
                        placeholder="Screens kg"
                        value={k.screens}
                        onChange={(e) => setK("screens", e.target.value)}
                      />
                      <Input
                        aria-label="Boards kg"
                        inputMode="decimal"
                        placeholder="Boards kg"
                        value={k.boards}
                        onChange={(e) => setK("boards", e.target.value)}
                      />
                      <Input
                        aria-label="Other kg"
                        inputMode="decimal"
                        placeholder="Other kg"
                        value={k.other}
                        onChange={(e) => setK("other", e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          void run(
                            () =>
                              rpc("record_lot_handover", {
                                p_lot: l.id,
                                p_receipt_no: receipt[l.id] ?? "",
                                p_kg_by_category: Object.fromEntries(
                                  Object.entries(k)
                                    .filter(([, v]) => Number(v) > 0)
                                    .map(([key, v]) => [key, Number(v)]),
                                ),
                              }),
                            "Handover recorded outside the bins.",
                          )
                        }
                      >
                        Record the VRRG handover
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
