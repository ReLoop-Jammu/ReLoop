"use client";

import type { Institution, Item, Partner } from "@/features/inventory/model";
import { readCollection, writeCollection } from "@/features/inventory/store/local";
import * as live from "@/features/inventory/store/supabase";

/** Hub items saved in this browser before the hub moved to the shared database. */
export function deviceItems(): Item[] {
  return readCollection<Item>("items").sort((a, b) =>
    a.id.localeCompare(b.id, "en", { numeric: true }),
  );
}

export type CopyResult = {
  copied: { from: string; to: string }[];
  failed: { from: string; error: string }[];
};

/**
 * Copies the chosen device items into the shared database, with the shops and
 * institutions they came from. Each copy gets a new shared tag and a history
 * note naming its old device tag; copied items are then removed from this
 * device so they can't be copied twice. Only items a person ticked are copied.
 */
export async function copyDeviceItems(ids: readonly string[]): Promise<CopyResult> {
  const chosen = deviceItems().filter((i) => ids.includes(i.id));
  const devicePartners = readCollection<Partner>("partners");
  const deviceInstitutions = readCollection<Institution>("institutions");
  const sharedPartners = await live.getPartners();
  const sharedInstitutions = await live.getInstitutions();

  const partnerFor = async (id?: string) => {
    const p = devicePartners.find((x) => x.id === id);
    if (!p) return undefined;
    const match = sharedPartners.find((s) => s.name === p.name && s.phone === p.phone);
    if (match) return match.id;
    const { id: _old, ...fields } = p;
    void _old;
    const saved = await live.savePartner(fields);
    sharedPartners.push(saved);
    return saved.id;
  };
  const institutionFor = async (id?: string) => {
    const i = deviceInstitutions.find((x) => x.id === id);
    if (!i) return undefined;
    const match = sharedInstitutions.find((s) => s.name === i.name);
    if (match) return match.id;
    const { id: _old, ...fields } = i;
    void _old;
    const saved = await live.saveInstitution(fields);
    sharedInstitutions.push(saved);
    return saved.id;
  };

  const result: CopyResult = { copied: [], failed: [] };
  for (const item of chosen) {
    try {
      const partnerId = await partnerFor(item.source.partnerId);
      const institutionId = await institutionFor(item.source.institutionId);
      const source = {
        ...item.source,
        ...(partnerId ? { partnerId } : { partnerId: undefined }),
        ...(institutionId ? { institutionId } : { institutionId: undefined }),
      };
      const {
        id: _id,
        events: _events,
        status: _status,
        listPaise: _l,
        currentPaise: _c,
        ...rest
      } = item;
      void [_id, _events, _status, _l, _c];
      const created = await live.createItem({ ...rest, source });
      // Bring over grade, prices, wipe and status exactly as they were.
      const saved = await live.saveItem({
        ...item,
        id: created.id,
        source,
        photos: created.photos,
        events: created.events,
      });
      await live.addNote(saved.id, `Copied from a hub device, where it was ${item.id}`, "copied");
      result.copied.push({ from: item.id, to: saved.id });
    } catch (e) {
      result.failed.push({ from: item.id, error: e instanceof Error ? e.message : "Not saved" });
    }
  }

  const done = new Set(result.copied.map((c) => c.from));
  writeCollection(
    "items",
    readCollection<Item>("items").filter((i) => !done.has(i.id)),
  );
  return result;
}
