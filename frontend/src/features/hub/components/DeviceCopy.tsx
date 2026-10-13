"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { categoryLabel, type Item } from "@/features/inventory/model";
import { copyDeviceItems, deviceItems, type CopyResult } from "../device-copy";
import { Panel } from "./ui";

const noSubscribe = () => () => {};
let cache: { at: number; items: Item[] } = { at: -1, items: [] };
/** Device items, re-read at most once a second so the store snapshot stays stable. */
function snapshot(): Item[] {
  if (Date.now() - cache.at > 1000) cache = { at: Date.now(), items: deviceItems() };
  return cache.items;
}
const EMPTY: Item[] = [];

/**
 * Offered only when this browser still holds hub items from before the shared
 * database. Nothing is ticked to start with: staff tick each real item and
 * confirm it was really received, so test or demo entries never reach the
 * live database.
 */
export function DeviceCopy() {
  const items = useSyncExternalStore(noSubscribe, snapshot, () => EMPTY);
  const [chosen, setChosen] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CopyResult | null>(null);

  if (items.length === 0 && !result) return null;

  async function copy() {
    setBusy(true);
    try {
      const r = await copyDeviceItems(chosen);
      cache.at = -1;
      setResult(r);
      setChosen([]);
      setConfirmed(false);
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <Panel title="Copy this device's items">
      <p className="text-sm leading-relaxed text-ink-soft">
        This browser still has {items.length} hub item{items.length === 1 ? "" : "s"} from before
        the shared database. Tick only items really received at the hub. Never copy tests or
        practice entries. Copies get new shared tags and are removed from this device.
      </p>
      {items.length > 0 && (
        <ul className="mt-3 max-h-64 divide-y divide-line overflow-y-auto rounded-lg border border-line text-sm">
          {items.map((i) => (
            <li key={i.id}>
              <label className="flex items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  checked={chosen.includes(i.id)}
                  onChange={() => toggle(i.id)}
                />
                <span className="font-mono text-xs">{i.id}</span>
                <span className="min-w-0 flex-1 truncate">
                  {[i.brand, i.model].filter(Boolean).join(" ") || categoryLabel(i.category)}
                </span>
                <span className="text-xs text-muted">{i.receivedAt.slice(0, 10)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {chosen.length > 0 && (
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          These {chosen.length} item{chosen.length === 1 ? " was" : "s were"} really received at the
          hub. They are not tests or demo data.
        </label>
      )}
      <Button
        size="sm"
        className="mt-3"
        disabled={busy || chosen.length === 0 || !confirmed}
        onClick={() => void copy()}
      >
        {busy ? "Copying…" : `Copy ${chosen.length || ""} to the shared database`}
      </Button>
      {result && (
        <div role="status" className="mt-3 text-sm">
          <p>
            Copied {result.copied.length}
            {result.copied.length > 0 &&
              `: ${result.copied.map((c) => `${c.from} → ${c.to}`).join(", ")}`}
            .
          </p>
          {result.failed.map((f) => (
            <p key={f.from} className="text-danger">
              {f.from} wasn&apos;t copied: {f.error}
            </p>
          ))}
        </div>
      )}
    </Panel>
  );
}
