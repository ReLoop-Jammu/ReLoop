"use client";

/*
 * Supabase adapter for the hub's data layer: the same functions as the
 * browser-storage version in ./index.ts, reading and writing the shared
 * database with the signed-in staff member's login. Row Level Security lets
 * only hub staff (and admins) in; the database assigns RL-JMU tags, logs grade,
 * status and price changes, applies handovers and runs the day-45/75 rules.
 */

import { allPages } from "@/lib/pages";
import { inspectionFromRow, inspectionToRow } from "../inspection";
import { authenticatedFetch } from "@/lib/auth-client";
import type {
  Handover,
  Institution,
  Item,
  ItemEvent,
  ItemStatus,
  Partner,
  RepairJob,
} from "../model";

const API = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
export const PHOTO_BUCKET = "item-photos";

/** Public URL of a stored item photo (the bucket is public for photos only). */
export const photoUrl = (path: string) => `${API}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
const pathFromUrl = (url: string) =>
  url.startsWith(photoUrl("")) ? decodeURIComponent(url.slice(photoUrl("").length)) : null;

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(`/rest/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `The shared database said no (${response.status}).`;
    throw new Error(message);
  }
  return data as T;
}
/** Every row of a list (Supabase sends at most 1,000 per request). */
const restAll = <T>(path: string) => allPages<T>((headers) => rest<T[]>(path, { headers }));
const write = (path: string, method: string, body: unknown) =>
  rest<Record<string, unknown>[]>(path, {
    method,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });

// ---------------------------------------------------------------- items

type ItemRow = {
  id: string;
  received_at: string;
  source_type: Item["source"]["type"];
  partner_id: string | null;
  institution_id: string | null;
  source_name: string;
  source_contact_name: string;
  source_phone: string;
  category: Item["category"];
  part_type: Item["partType"] | null;
  brand: string;
  model: string;
  description: string;
  has_battery: boolean;
  weight_kg: number | null;
  grade: Item["grade"];
  graded_at: string | null;
  checklist: Record<string, boolean>;
  faults: string;
  wipe_required: boolean;
  wipe_method: NonNullable<Item["dataWipe"]["method"]> | null;
  wiped_at: string | null;
  rack: string;
  buy_mode: Item["buyMode"];
  buy_paise: number;
  purchase_payment_method: NonNullable<Item["purchasePaymentMethod"]>;
  purchase_reference: string;
  purchase_paid_at: string | null;
  expected_resale_paise: number | null;
  list_paise: number | null;
  current_paise: number | null;
  price_cut_at: string | null;
  status: ItemStatus;
  listed_at: string | null;
  sold_at: string | null;
  sold_paise: number | null;
  fulfilment: Item["fulfilment"] | null;
  parent_id: string | null;
  handover_id: string | null;
  item_photos?: { position: number; storage_path: string }[];
  hidden: boolean;
  returned_at: string | null;
  inspection: unknown;
  inspected_at: string | null;
  new_price_paise: number | null;
  new_price_source: string;
  new_price_checked_on: string | null;
  item_events?: { at: string; type: string; note: string }[];
};

const ITEM_SELECT =
  "*,item_photos(position,storage_path),item_events(at,type,note)&item_events.order=at.asc";

const opt = <T>(v: T | null | undefined) => (v === null || v === undefined ? undefined : v);

export function rowToItem(r: ItemRow): Item {
  const item: Item = {
    id: r.id,
    receivedAt: r.received_at,
    source: {
      type: r.source_type,
      ...(r.partner_id && { partnerId: r.partner_id }),
      ...(r.institution_id && { institutionId: r.institution_id }),
      ...(r.source_name && { name: r.source_name }),
      ...(r.source_contact_name && { contactName: r.source_contact_name }),
      ...(r.source_phone && { phone: r.source_phone }),
    },
    category: r.category,
    brand: r.brand,
    model: r.model,
    description: r.description,
    photos: [...(r.item_photos ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((p) => photoUrl(p.storage_path)),
    hasBattery: r.has_battery,
    grade: r.grade,
    checklist: r.checklist ?? {},
    faults: r.faults,
    dataWipe: {
      required: r.wipe_required,
      ...(r.wipe_method && { method: r.wipe_method }),
      ...(r.wiped_at && { doneAt: r.wiped_at }),
    },
    rack: r.rack,
    buyMode: r.buy_mode,
    buyPaise: Number(r.buy_paise),
    purchasePaymentMethod: r.purchase_payment_method,
    expectedResalePaise: r.expected_resale_paise === null ? null : Number(r.expected_resale_paise),
    listPaise: r.list_paise === null ? null : Number(r.list_paise),
    currentPaise: r.current_paise === null ? null : Number(r.current_paise),
    status: r.status,
    events: (r.item_events ?? []).map((e): ItemEvent => ({
      at: e.at,
      type: e.type,
      ...(e.note && { note: e.note }),
    })),
  };
  const extra: Partial<Item> = {
    partType: opt(r.part_type),
    weightKg: r.weight_kg === null ? undefined : Number(r.weight_kg),
    gradedAt: opt(r.graded_at),
    purchaseReference: r.purchase_reference || undefined,
    purchasePaidAt: opt(r.purchase_paid_at),
    priceCutAt: opt(r.price_cut_at),
    listedAt: opt(r.listed_at),
    soldAt: opt(r.sold_at),
    soldPaise: r.sold_paise === null ? undefined : Number(r.sold_paise),
    fulfilment: opt(r.fulfilment),
    parentId: opt(r.parent_id),
    handoverId: opt(r.handover_id),
    hidden: r.hidden ? true : undefined,
    returnedAt: opt(r.returned_at),
    inspection: inspectionFromRow(r.inspection),
    inspectedAt: opt(r.inspected_at),
    newPricePaise:
      r.new_price_paise === null || r.new_price_paise === undefined
        ? undefined
        : Number(r.new_price_paise),
    newPriceSource: r.new_price_source || undefined,
    newPriceCheckedOn: opt(r.new_price_checked_on),
  };
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) Object.assign(item, { [k]: v });
  return item;
}

/** The columns an item writes. Tags, history and who created it come from the database. */
export function itemToRow(i: Omit<Item, "id" | "events" | "photos">) {
  return {
    received_at: i.receivedAt,
    source_type: i.source.type,
    partner_id: i.source.partnerId ?? null,
    institution_id: i.source.institutionId ?? null,
    source_name: i.source.name ?? "",
    source_contact_name: i.source.contactName ?? "",
    source_phone: i.source.phone ?? "",
    category: i.category,
    part_type: i.partType ?? null,
    brand: i.brand,
    model: i.model,
    description: i.description,
    has_battery: i.hasBattery,
    weight_kg: i.weightKg ?? null,
    grade: i.grade,
    graded_at: i.gradedAt ?? null,
    checklist: i.checklist,
    faults: i.faults,
    wipe_required: i.dataWipe.required,
    wipe_method: i.dataWipe.method ?? null,
    wiped_at: i.dataWipe.doneAt ?? null,
    rack: i.rack,
    buy_mode: i.buyMode,
    buy_paise: i.buyPaise,
    purchase_payment_method: i.purchasePaymentMethod ?? "not_paid",
    purchase_reference: i.purchaseReference ?? "",
    purchase_paid_at: i.purchasePaidAt ?? null,
    expected_resale_paise: i.expectedResalePaise,
    list_paise: i.listPaise,
    current_paise: i.currentPaise,
    price_cut_at: i.priceCutAt ?? null,
    status: i.status,
    listed_at: i.listedAt ?? null,
    sold_at: i.soldAt ?? null,
    sold_paise: i.soldPaise ?? null,
    fulfilment: i.fulfilment ?? null,
    parent_id: i.parentId ?? null,
    handover_id: i.handoverId ?? null,
    hidden: i.hidden ?? false,
    inspection: inspectionToRow(i.inspection),
    inspected_at: i.inspectedAt ?? null,
    new_price_paise: i.newPricePaise ?? null,
    new_price_source: i.newPriceSource ?? "",
    new_price_checked_on: i.newPriceCheckedOn ?? null,
  };
}

/**
 * Event types the database writes itself when an item changes (see
 * log_item_change), so the client never saves them twice.
 */
const DB_LOGGED =
  /^(received|graded|price_changed|data_wiped|hidden|unhidden|returned|edited|status:.*)$/;

/**
 * History the client added that the database doesn't log by itself (notes,
 * repair steps, stripping), not yet saved. Compared by type and note, in order.
 */
export function unsavedEvents(
  saved: readonly ItemEvent[],
  local: readonly ItemEvent[],
): ItemEvent[] {
  const left = [...saved];
  const fresh: ItemEvent[] = [];
  for (const e of local) {
    const i = left.findIndex((s) => s.type === e.type && (s.note ?? "") === (e.note ?? ""));
    if (i >= 0) left.splice(i, 1);
    else if (!DB_LOGGED.test(e.type)) fresh.push(e);
  }
  return fresh;
}

let rulesRanAt = 0;
/** Runs the day-45/75 rules in the database (idempotent), at most every 5 minutes. */
export async function applyAutomaticRules(): Promise<Item[]> {
  if (Date.now() - rulesRanAt < 5 * 60 * 1000) return [];
  rulesRanAt = Date.now();
  await rest<number>("rpc/run_stock_rules", { method: "POST", body: "{}" });
  return [];
}

export async function getItems(): Promise<Item[]> {
  await applyAutomaticRules();
  const rows = await restAll<ItemRow>(`items?select=${ITEM_SELECT}&order=id.desc`);
  return rows.map(rowToItem);
}

export async function getItem(id: string): Promise<Item | null> {
  await applyAutomaticRules();
  const rows = await rest<ItemRow[]>(`items?select=${ITEM_SELECT}&id=eq.${encodeURIComponent(id)}`);
  return rows[0] ? rowToItem(rows[0]) : null;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Makes the item's photos match `photos`: uploads new ones, keeps stored ones, removes dropped ones. */
async function syncPhotos(itemId: string, photos: string[]) {
  const existing = await rest<{ storage_path: string }[]>(
    `item_photos?select=storage_path&item_id=eq.${encodeURIComponent(itemId)}`,
  );
  const paths: string[] = [];
  for (const [i, photo] of photos.slice(0, 4).entries()) {
    const stored = pathFromUrl(photo);
    if (stored) {
      paths.push(stored);
      continue;
    }
    const path = `${itemId}/${Date.now()}-${i}.jpg`;
    const upload = await authenticatedFetch(`/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", "x-upsert": "false" },
      body: await dataUrlToBlob(photo),
    });
    if (!upload.ok) throw new Error("A photo couldn't be uploaded. Try a smaller photo.");
    paths.push(path);
  }
  await rest(`item_photos?item_id=eq.${encodeURIComponent(itemId)}`, { method: "DELETE" });
  if (paths.length) {
    await rest("item_photos", {
      method: "POST",
      body: JSON.stringify(
        paths.map((storage_path, position) => ({ item_id: itemId, position, storage_path })),
      ),
    });
  }
  for (const { storage_path } of existing.filter((e) => !paths.includes(e.storage_path))) {
    await authenticatedFetch(`/storage/v1/object/${PHOTO_BUCKET}/${storage_path}`, {
      method: "DELETE",
    });
  }
}

export async function createItem(
  input: Omit<Item, "id" | "events" | "status" | "currentPaise" | "listPaise"> & {
    status?: ItemStatus;
  },
): Promise<Item> {
  const { photos, ...rest } = input;
  const [row] = await write("items", "POST", {
    ...itemToRow({
      ...rest,
      status: input.grade ? "graded" : "received",
      listPaise: null,
      currentPaise: null,
    }),
    // The database assigns the next RL-JMU tag and sets graded_at.
    graded_at: null,
  });
  const id = String(row?.id);
  if (photos.length) await syncPhotos(id, photos);
  const item = await getItem(id);
  if (!item) throw new Error("The new item wasn't saved.");
  return item;
}

export async function saveItem(item: Item): Promise<Item> {
  const { id, events, photos, ...fields } = item;
  const before = await getItem(id);
  // Brand, model and description change only through editItemDetails (with a reason).
  const { brand: _b, model: _m, description: _d, ...row } = itemToRow(fields);
  void _b;
  void _m;
  void _d;
  const rows = await write(`items?id=eq.${encodeURIComponent(id)}`, "PATCH", row);
  if (rows.length !== 1) throw new Error(`Item ${id} wasn't saved.`);
  await syncPhotos(id, photos);
  for (const e of unsavedEvents(before?.events ?? [], events))
    await addNote(id, e.note ?? "", e.type);
  return (await getItem(id)) ?? item;
}

/** Corrects brand, model and description; the reason goes into the history. */
export async function editItemDetails(
  id: string,
  d: { brand: string; model: string; description: string },
  reason: string,
): Promise<Item> {
  await rest("rpc/edit_item_details", {
    method: "POST",
    body: JSON.stringify({
      p_id: id,
      p_brand: d.brand,
      p_model: d.model,
      p_description: d.description,
      p_reason: reason,
    }),
  });
  const item = await getItem(id);
  if (!item) throw new Error(`Item ${id} not found`);
  return item;
}

/** Records that a sold item came back, with the reason. */
export async function markReturned(id: string, reason: string): Promise<Item> {
  await rest("rpc/mark_item_returned", {
    method: "POST",
    body: JSON.stringify({ p_id: id, p_reason: reason }),
  });
  const item = await getItem(id);
  if (!item) throw new Error(`Item ${id} not found`);
  return item;
}

/** Hides an item from every public page, or shows it again. */
export async function setHidden(id: string, hidden: boolean): Promise<Item> {
  const rows = await write(`items?id=eq.${encodeURIComponent(id)}`, "PATCH", { hidden });
  if (rows.length !== 1) throw new Error(`Item ${id} not found`);
  const item = await getItem(id);
  if (!item) throw new Error(`Item ${id} not found`);
  return item;
}

export async function setItemStatus(id: string, status: ItemStatus, note?: string): Promise<Item> {
  const rows = await write(`items?id=eq.${encodeURIComponent(id)}`, "PATCH", { status });
  if (rows.length !== 1) throw new Error(`Item ${id} not found`);
  if (note) await addNote(id, note);
  const item = await getItem(id);
  if (!item) throw new Error(`Item ${id} not found`);
  return item;
}

/** Adds a staff note to an item's history. */
export async function addNote(itemId: string, note: string, type = "note") {
  await rest("item_events", {
    method: "POST",
    body: JSON.stringify({ item_id: itemId, type, note: note.slice(0, 500) }),
  });
}

// ---------------------------------------------------------------- partners & institutions

type PartnerRow = {
  id: string;
  type: Partner["type"];
  name: string;
  owner: string;
  phone: string;
  market: string;
  route_day: Partner["routeDay"];
  is_repair_partner: boolean;
  status: Partner["status"];
  joined_at: string;
  notes: string;
};
const toPartner = (r: PartnerRow): Partner => ({
  id: r.id,
  type: r.type,
  name: r.name,
  owner: r.owner,
  phone: r.phone,
  market: r.market,
  routeDay: r.route_day,
  isRepairPartner: r.is_repair_partner,
  status: r.status,
  joinedAt: r.joined_at,
  notes: r.notes,
});

export async function getPartners(): Promise<Partner[]> {
  return (await restAll<PartnerRow>("partners?select=*&order=name.asc,id.asc")).map(toPartner);
}

/** New rows get a database id; ids that aren't uuids (from a device) are dropped. */
const dbId = (id?: string) => (id && /^[0-9a-f-]{36}$/i.test(id) ? { id } : {});

async function upsertRow<R>(table: string, id: string | undefined, row: object): Promise<R> {
  const rows = id
    ? await write(`${table}?id=eq.${encodeURIComponent(id)}`, "PATCH", row)
    : await write(table, "POST", row);
  if (rows.length !== 1) throw new Error("That change wasn't saved.");
  return rows[0] as R;
}

export async function savePartner(p: Omit<Partner, "id"> & { id?: string }): Promise<Partner> {
  const row = {
    type: p.type,
    name: p.name,
    owner: p.owner,
    phone: p.phone,
    market: p.market,
    route_day: p.routeDay,
    is_repair_partner: p.isRepairPartner,
    status: p.status,
    joined_at: p.joinedAt,
    notes: p.notes,
  };
  return toPartner(await upsertRow<PartnerRow>("partners", dbId(p.id).id, row));
}

export async function deletePartner(id: string): Promise<void> {
  await rest(`partners?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

type InstitutionRow = {
  id: string;
  name: string;
  type: Institution["type"];
  contact_name: string;
  phone: string;
  email: string;
  is_anchor: boolean;
  notes: string;
};
const toInstitution = (r: InstitutionRow): Institution => ({
  id: r.id,
  name: r.name,
  type: r.type,
  contactName: r.contact_name,
  phone: r.phone,
  email: r.email,
  isAnchor: r.is_anchor,
  notes: r.notes,
});

export async function getInstitutions(): Promise<Institution[]> {
  return (await restAll<InstitutionRow>("institutions?select=*&order=name.asc,id.asc")).map(
    toInstitution,
  );
}

export async function saveInstitution(
  i: Omit<Institution, "id"> & { id?: string },
): Promise<Institution> {
  const row = {
    name: i.name,
    type: i.type,
    contact_name: i.contactName,
    phone: i.phone,
    email: i.email,
    is_anchor: i.isAnchor,
    notes: i.notes,
  };
  return toInstitution(await upsertRow<InstitutionRow>("institutions", dbId(i.id).id, row));
}

// ---------------------------------------------------------------- handovers and repairs

type HandoverRow = {
  id: string;
  date: string;
  recycler: string;
  on_behalf_of: string | null;
  kg_by_category: Record<string, number>;
  battery_kg: number;
  item_ids: string[];
  receipt_no: string;
  rate_per_kg_paise: number | null;
  amount_paise: number | null;
  notes: string;
};
const toHandover = (r: HandoverRow): Handover => ({
  id: r.id,
  date: r.date,
  recycler: r.recycler,
  ...(r.on_behalf_of && { onBehalfOf: r.on_behalf_of }),
  kgByCategory: r.kg_by_category ?? {},
  batteryKg: Number(r.battery_kg),
  itemIds: r.item_ids ?? [],
  receiptNo: r.receipt_no,
  ...(r.rate_per_kg_paise !== null && { ratePerKgPaise: Number(r.rate_per_kg_paise) }),
  ...(r.amount_paise !== null && { amountPaise: Number(r.amount_paise) }),
  notes: r.notes,
});

export async function getHandovers(): Promise<Handover[]> {
  return (await restAll<HandoverRow>("handovers?select=*&order=date.desc,id.asc")).map(toHandover);
}

/** Records a handover; the database marks the included scrap-cage items as handed over. */
export async function saveHandover(h: Omit<Handover, "id"> & { id?: string }): Promise<Handover> {
  const row = {
    date: h.date,
    recycler: h.recycler,
    on_behalf_of: h.onBehalfOf ?? null,
    kg_by_category: h.kgByCategory,
    battery_kg: h.batteryKg,
    item_ids: h.itemIds,
    receipt_no: h.receiptNo,
    rate_per_kg_paise: h.ratePerKgPaise ?? null,
    amount_paise: h.amountPaise ?? null,
    notes: h.notes,
  };
  return toHandover(await upsertRow<HandoverRow>("handovers", dbId(h.id).id, row));
}

type RepairRow = {
  id: string;
  item_id: string;
  partner_id: string;
  fault: string;
  fee_paise: number;
  sent_at: string;
  returned_at: string | null;
  outcome: RepairJob["outcome"] | null;
};
const toRepair = (r: RepairRow): RepairJob => ({
  id: r.id,
  itemId: r.item_id,
  partnerId: r.partner_id,
  fault: r.fault,
  feePaise: Number(r.fee_paise),
  sentAt: r.sent_at,
  ...(r.returned_at && { returnedAt: r.returned_at }),
  ...(r.outcome && { outcome: r.outcome }),
});

export async function getRepairJobs(): Promise<RepairJob[]> {
  return (await restAll<RepairRow>("repair_jobs?select=*&order=sent_at.desc,id.asc")).map(toRepair);
}

export async function saveRepairJob(
  j: Omit<RepairJob, "id"> & { id?: string },
): Promise<RepairJob> {
  const row = {
    item_id: j.itemId,
    partner_id: j.partnerId,
    fault: j.fault,
    fee_paise: j.feePaise,
    sent_at: j.sentAt,
    returned_at: j.returnedAt ?? null,
    outcome: j.outcome ?? null,
  };
  return toRepair(await upsertRow<RepairRow>("repair_jobs", dbId(j.id).id, row));
}
