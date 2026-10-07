"use client";

import { Download, Upload, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { exportAll, getItems, importAll, type Backup } from "@/features/inventory/store";
import { storageUsageBytes } from "@/features/inventory/store/local";
import { toShopItem, type ShopSnapshot } from "@/features/shop/model";
import { downloadFile } from "../photos";
import { useHubData } from "../useHubData";
import { PageTitle, Panel } from "./ui";

const STORAGE_BUDGET = 5 * 1024 * 1024; // typical browser limit per site

export function DataPage() {
  const { items, submissions, refresh } = useHubData();
  const [usage, setUsage] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser storage after mount
    setUsage(storageUsageBytes());
  }, [items]);

  const stamp = new Date().toISOString().slice(0, 10);
  const listed = items.filter((i) => i.status === "listed").length;

  const backup = async () => {
    downloadFile(`reloop-hub-backup-${stamp}.json`, JSON.stringify(await exportAll(), null, 2));
    setMsg("Backup downloaded. Keep it somewhere safe (e.g. a shared drive).");
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm("Replace ALL hub data on this device with this backup?")) return;
    try {
      await importAll(JSON.parse(await file.text()) as Backup);
      await refresh();
      setMsg("Backup restored.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  const publish = async () => {
    const shopItems = (await getItems({ status: "listed" }))
      .map(toShopItem)
      .filter((x) => x !== null);
    const snapshot: ShopSnapshot = { publishedAt: new Date().toISOString(), items: shopItems };
    downloadFile("shop-snapshot.json", JSON.stringify(snapshot, null, 2));
    setMsg(`Shop file downloaded with ${shopItems.length} listed item(s).`);
  };

  return (
    <>
      <PageTitle
        title="Backup & publish"
        description="Hub data lives only on this device until the shared database is connected."
      />
      {msg && (
        <p role="status" className="mb-4 rounded-lg bg-grade-a-bg px-4 py-2 text-sm text-grade-a">
          {msg}
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Daily backup">
          <p className="text-sm leading-relaxed text-ink-soft">
            Download everything (items, photos, shops, handovers) as one file. Do this at the end of
            every day.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void backup()}>
              <Download className="size-4" aria-hidden="true" /> Download backup
            </Button>
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-sunken has-focus-visible:ring-2 has-focus-visible:ring-brand-500">
              <Upload className="size-4" aria-hidden="true" /> Restore…
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(e) => void restore(e.target.files?.[0])}
              />
            </label>
          </div>
          <p className="mt-4 text-xs text-muted">
            Storage used: {(usage / 1024 / 1024).toFixed(2)} MB of about{" "}
            {STORAGE_BUDGET / 1024 / 1024} MB
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
            <div
              className="h-full bg-brand-600"
              style={{ width: `${Math.min(100, (usage / STORAGE_BUDGET) * 100)}%` }}
            />
          </div>
        </Panel>

        <Panel title="Publish stock to the shop" className="xl:col-span-2">
          <p className="text-sm leading-relaxed text-ink-soft">
            Buyers can&apos;t see this device. To update the public shop, download the shop file (
            {listed} listed item
            {listed === 1 ? "" : "s"}) and send it to the developer, who replaces{" "}
            <code className="rounded bg-sunken px-1">frontend/src/data/shop-snapshot.json</code> and
            pushes. The site updates in a few minutes. Buy prices and sources are never included.
          </p>
          <Button size="sm" className="mt-4" onClick={() => void publish()}>
            <UploadCloud className="size-4" aria-hidden="true" /> Download shop file
          </Button>
        </Panel>

        <Panel title={`Requests on this device (${submissions.length})`} className="xl:col-span-3">
          <p className="mb-3 text-xs text-muted">
            Sign-ups and bookings arrive by WhatsApp or email. This list only shows requests made
            from this browser (useful when filling a form for a walk-in seller).
          </p>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted">None.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {submissions.map((s) => (
                <li key={s.id} className="py-2">
                  <span className="font-medium">{s.kind.replace(/_/g, " ")}</span>
                  <span className="ml-2 text-xs text-muted">
                    {new Date(s.createdAt).toLocaleString("en-IN")}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {Object.entries(s.fields)
                      .filter(([, v]) => v)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
