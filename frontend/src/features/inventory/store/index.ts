"use client";

/*
 * DATA LAYER for the hub and the public forms. Every read and write goes
 * through these functions. With Supabase configured (production) they use the
 * shared database (./supabase) as the signed-in staff member; without it
 * (local development, CI) they use this browser's storage (./local).
 */

import type {
  Handover,
  Institution,
  Item,
  ItemStatus,
  Partner,
  RepairJob,
  Submission,
} from "../model";
import { nextItemId, randomId } from "../ids";
import { applyStockRules } from "../rules";
import { readCollection, writeCollection } from "./local";
import * as live from "./supabase";

/** True when the hub reads and writes the shared Supabase database. */
export const SHARED_DATABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

const C = {
  items: "items",
  partners: "partners",
  institutions: "institutions",
  handovers: "handovers",
  repairJobs: "repair_jobs",
} as const;

const nowIso = () => new Date().toISOString();

function upsert<T extends { id: string }>(name: string, row: T): T {
  const rows = readCollection<T>(name);
  const i = rows.findIndex((r) => r.id === row.id);
  if (i === -1) rows.push(row);
  else rows[i] = row;
  writeCollection(name, rows);
  return row;
}

function remove(name: string, id: string): void {
  writeCollection(
    name,
    readCollection<{ id: string }>(name).filter((r) => r.id !== id),
  );
}

// ---------------------------------------------------------------- items

export type ItemFilter = { status?: ItemStatus | ItemStatus[]; grade?: Item["grade"]; q?: string };

/** Reads always see up-to-date prices: the day-45/75 rules run first. */
export async function getItems(filter: ItemFilter = {}): Promise<Item[]> {
  const all = SHARED_DATABASE
    ? await live.getItems()
    : (await applyAutomaticRules(), readCollection<Item>(C.items));
  const statuses = filter.status ? ([] as ItemStatus[]).concat(filter.status) : null;
  const q = filter.q?.trim().toLowerCase();
  return all
    .filter(
      (i) =>
        (!statuses || statuses.includes(i.status)) &&
        (filter.grade === undefined || i.grade === filter.grade) &&
        (!q || `${i.id} ${i.brand} ${i.model} ${i.description}`.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.id.localeCompare(a.id, "en", { numeric: true }));
}

export async function getItem(id: string): Promise<Item | null> {
  if (SHARED_DATABASE) return live.getItem(id);
  await applyAutomaticRules();
  return readCollection<Item>(C.items).find((i) => i.id === id) ?? null;
}

export type NewItem = Omit<
  Item,
  "id" | "events" | "status" | "grade" | "checklist" | "currentPaise" | "listPaise"
> &
  Partial<Pick<Item, "grade" | "checklist">>;

/** Logs a new item at intake and assigns the next RL-JMU tag. */
export async function createItem(input: NewItem): Promise<Item> {
  if (SHARED_DATABASE) {
    return live.createItem({
      ...input,
      grade: input.grade ?? null,
      checklist: input.checklist ?? {},
    });
  }
  const items = readCollection<Item>(C.items);
  const item: Item = {
    ...input,
    id: nextItemId(items.map((i) => i.id)),
    grade: input.grade ?? null,
    checklist: input.checklist ?? {},
    status: input.grade ? "graded" : "received",
    gradedAt: input.grade ? nowIso() : undefined,
    listPaise: null,
    currentPaise: null,
    events: [
      {
        at: nowIso(),
        type: "received",
        note: `Received from ${input.source.type.replace("_", " ")}`,
      },
    ],
  };
  writeCollection(C.items, [...items, item]);
  return item;
}

export async function saveItem(item: Item): Promise<Item> {
  if (SHARED_DATABASE) return live.saveItem(item);
  return upsert(C.items, item);
}

export async function setItemStatus(id: string, status: ItemStatus, note?: string): Promise<Item> {
  if (SHARED_DATABASE) return live.setItemStatus(id, status, note);
  const item = await getItem(id);
  if (!item) throw new Error(`Item ${id} not found`);
  const at = nowIso();
  const next: Item = {
    ...item,
    status,
    ...(status === "listed" && !item.listedAt && { listedAt: at }),
    ...(status === "sold" && { soldAt: at, soldPaise: item.currentPaise ?? undefined }),
    events: [...item.events, { at, type: `status:${status}`, note }],
  };
  return upsert(C.items, next);
}

/** Runs the plan's day-45 / day-75 rules. Called whenever the hub opens. */
export async function applyAutomaticRules(now = new Date()): Promise<Item[]> {
  if (SHARED_DATABASE) return live.applyAutomaticRules();
  const items = readCollection<Item>(C.items);
  const changed = applyStockRules(items, now);
  if (changed.length) {
    const byId = new Map(changed.map((i) => [i.id, i]));
    writeCollection(
      C.items,
      items.map((i) => byId.get(i.id) ?? i),
    );
  }
  return changed;
}

// ---------------------------------------------------------------- partners & institutions

export async function getPartners(): Promise<Partner[]> {
  if (SHARED_DATABASE) return live.getPartners();
  return readCollection<Partner>(C.partners).sort((a, b) => a.name.localeCompare(b.name));
}
export async function savePartner(p: Omit<Partner, "id"> & { id?: string }): Promise<Partner> {
  if (SHARED_DATABASE) return live.savePartner(p);
  return upsert(C.partners, { ...p, id: p.id ?? randomId("shop") });
}
export async function deletePartner(id: string): Promise<void> {
  if (SHARED_DATABASE) return live.deletePartner(id);
  remove(C.partners, id);
}

export async function getInstitutions(): Promise<Institution[]> {
  if (SHARED_DATABASE) return live.getInstitutions();
  return readCollection<Institution>(C.institutions).sort((a, b) => a.name.localeCompare(b.name));
}
export async function saveInstitution(
  i: Omit<Institution, "id"> & { id?: string },
): Promise<Institution> {
  if (SHARED_DATABASE) return live.saveInstitution(i);
  return upsert(C.institutions, { ...i, id: i.id ?? randomId("inst") });
}

// ---------------------------------------------------------------- handovers and repairs

export async function getHandovers(): Promise<Handover[]> {
  if (SHARED_DATABASE) return live.getHandovers();
  return readCollection<Handover>(C.handovers).sort((a, b) => b.date.localeCompare(a.date));
}

/** Records a recycler handover and marks the included items as handed over. */
export async function saveHandover(h: Omit<Handover, "id"> & { id?: string }): Promise<Handover> {
  if (SHARED_DATABASE) return live.saveHandover(h);
  const handover = upsert(C.handovers, { ...h, id: h.id ?? randomId("ho") });
  const at = nowIso();
  writeCollection(
    C.items,
    readCollection<Item>(C.items).map((i) =>
      handover.itemIds.includes(i.id) && i.status !== "handed_over"
        ? {
            ...i,
            status: "handed_over" as const,
            handoverId: handover.id,
            events: [
              ...i.events,
              { at, type: "handed_over", note: `Receipt ${handover.receiptNo}` },
            ],
          }
        : i,
    ),
  );
  return handover;
}

export async function getRepairJobs(): Promise<RepairJob[]> {
  if (SHARED_DATABASE) return live.getRepairJobs();
  return readCollection<RepairJob>(C.repairJobs).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}
export async function saveRepairJob(
  j: Omit<RepairJob, "id"> & { id?: string },
): Promise<RepairJob> {
  if (SHARED_DATABASE) return live.saveRepairJob(j);
  return upsert(C.repairJobs, { ...j, id: j.id ?? randomId("rep") });
}

// ---------------------------------------------------------------- public form submissions

/**
 * Records a public form request (reservation, enquiry or institution pickup)
 * for hub staff, through the site's /api/requests route; nothing is kept on
 * the visitor's device. Resolves `saved: false` instead of failing, so the
 * WhatsApp/email handoff always goes ahead.
 */
export async function addSubmission(
  kind: Submission["kind"],
  fields: Record<string, string>,
  itemId?: string,
): Promise<{ saved: boolean }> {
  try {
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, fields, ...(itemId && { itemId }) }),
    });
    return { saved: response.ok };
  } catch {
    return { saved: false };
  }
}

// ---------------------------------------------------------------- backup & publishing

const ALL = Object.values(C);
export type Backup = { version: 1; exportedAt: string; data: Record<string, unknown[]> };

/** Everything in the hub as one file: the shared database for staff, or this device. */
export async function exportAll(): Promise<Backup> {
  if (SHARED_DATABASE) {
    const [items, partners, institutions, handovers, repairJobs] = await Promise.all([
      live.getItems(),
      live.getPartners(),
      live.getInstitutions(),
      live.getHandovers(),
      live.getRepairJobs(),
    ]);
    return {
      version: 1,
      exportedAt: nowIso(),
      data: { items, partners, institutions, handovers, repair_jobs: repairJobs },
    };
  }
  return {
    version: 1,
    exportedAt: nowIso(),
    data: Object.fromEntries(ALL.map((name) => [name, readCollection(name)])),
  };
}

export async function importAll(backup: Backup): Promise<void> {
  if (SHARED_DATABASE) {
    throw new Error(
      "Restoring a file over the shared database isn't possible here. Use “Copy this device's items” for items that were only on this device.",
    );
  }
  if (backup?.version !== 1 || typeof backup.data !== "object")
    throw new Error("This is not a ReLoop backup file.");
  for (const name of ALL)
    writeCollection(name, Array.isArray(backup.data[name]) ? backup.data[name] : []);
}
