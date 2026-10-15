"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Table, Td, Th } from "@/components/ui/Table";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { returnRepairJob } from "@/features/route/api";
import { formatPrice } from "@/lib/utils/money";
import { useHubData } from "../useHubData";
import { repairBoard } from "../repairs";
import { PageTitle, Panel } from "./ui";

/** Items out with a repair partner: who has them, the fault, the agreed fee and how long they have been out. */
export function RepairsPage() {
  const { items, partners, repairJobs, refresh } = useHubData();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const board = useMemo(
    () => repairBoard(repairJobs, items, partners, new Date()),
    [repairJobs, items, partners],
  );

  async function close(id: string, outcome: "fixed" | "not_fixable") {
    setBusy(id);
    setError("");
    try {
      await returnRepairJob(id, outcome);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageTitle
        title="Repairs"
        description="Items sent to repair partners. Record each one back, fixed or not fixable. The agreed fee is a cost of the item and is never shown to buyers."
      />
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-bg p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Panel title={`Out now (${board.open.length})`}>
        {board.open.length === 0 ? (
          <p className="text-sm text-muted">Nothing is out for repair.</p>
        ) : (
          <Table caption="Items out for repair">
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Partner</Th>
                <Th>Fault</Th>
                <Th className="text-right">Agreed fee</Th>
                <Th>Sent</Th>
                <Th className="text-right">Days out</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {board.open.map((r) => (
                <tr key={r.id} className={r.overdue ? "bg-warning-bg" : undefined}>
                  <Td>
                    <Link
                      href={`/hub/items/${r.itemId}`}
                      className="font-mono text-brand-600 underline"
                    >
                      {r.itemId}
                    </Link>
                    <span className="block text-xs text-muted">{r.itemName}</span>
                  </Td>
                  <Td>{r.partnerName}</Td>
                  <Td>{r.fault || "—"}</Td>
                  <Td className="text-right tabular-nums">{formatPrice(r.feePaise)}</Td>
                  <Td>{r.sentOn}</Td>
                  <Td className="text-right tabular-nums">
                    {r.daysOut}
                    {r.overdue && <span className="sr-only"> (overdue)</span>}
                  </Td>
                  <Td>
                    {SHARED_DATABASE ? (
                      <span className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy === r.id}
                          onClick={() => void close(r.id, "fixed")}
                        >
                          Back, fixed
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy === r.id}
                          onClick={() => void close(r.id, "not_fixable")}
                        >
                          Not fixable
                        </Button>
                      </span>
                    ) : (
                      <Link href={`/hub/items/${r.itemId}`} className="text-brand-600 underline">
                        Open item
                      </Link>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title="Recently back">
          {board.closed.length === 0 ? (
            <p className="text-sm text-muted">No repairs have come back yet.</p>
          ) : (
            <Table caption="Repairs that came back">
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th>Partner</Th>
                  <Th>Result</Th>
                  <Th className="text-right">Fee</Th>
                  <Th className="text-right">Days out</Th>
                </tr>
              </thead>
              <tbody>
                {board.closed.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link
                        href={`/hub/items/${r.itemId}`}
                        className="font-mono text-brand-600 underline"
                      >
                        {r.itemId}
                      </Link>
                    </Td>
                    <Td>{r.partnerName}</Td>
                    <Td>{r.outcome === "fixed" ? "Fixed" : "Not fixable (C)"}</Td>
                    <Td className="text-right tabular-nums">{formatPrice(r.feePaise)}</Td>
                    <Td className="text-right tabular-nums">{r.daysOut}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
