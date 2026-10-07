"use client";

import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BUSINESS_RULES } from "@/config/business-rules";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import {
  GRADES,
  GRADE_INFO,
  PART_TYPES,
  categoryLabel,
  statusLabel,
  type Fulfilment,
  type Grade,
  type Item,
  type PartType,
  type WipeMethod,
} from "@/features/inventory/model";
import {
  createItem,
  getItem,
  getPartners,
  saveItem,
  saveRepairJob,
  setItemStatus,
} from "@/features/inventory/store";
import type { Partner } from "@/features/inventory/model";
import { formatPrice } from "@/lib/utils/money";
import { CHECKLISTS } from "../checklists";
import {
  Field,
  Input,
  PageTitle,
  Panel,
  Select,
  hubInput,
  paiseToRupeeInput,
  rupeesToPaiseOrNull,
} from "./ui";

const at = () => new Date().toISOString();
const withEvent = (item: Item, type: string, note?: string): Item => ({
  ...item,
  events: [...item.events, { at: at(), type, note }],
});

export function ItemDetail({ id }: { id: string }) {
  const formId = useId();
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [msg, setMsg] = useState("");

  const reload = useCallback(async () => {
    const [i, p] = await Promise.all([getItem(id), getPartners()]);
    setItem(i);
    setPartners(p);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser storage after mount
    void reload();
  }, [reload]);

  if (item === undefined) return <p className="text-sm text-muted">Loading…</p>;
  if (item === null)
    return (
      <Panel>
        <p>No item {id} on this device.</p>
        <Link href="/hub/items" className="mt-3 inline-block text-brand-600 underline">
          Back to items
        </Link>
      </Panel>
    );

  const save = async (next: Item, note: string) => {
    await saveItem(next);
    setMsg(note);
    await reload();
  };

  const title = [item.brand, item.model].filter(Boolean).join(" ") || "Untitled";
  const wipeDone = !item.dataWipe.required || Boolean(item.dataWipe.doneAt);

  return (
    <>
      <Link
        href="/hub/items"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All items
      </Link>
      <PageTitle
        title={`${item.id} · ${title}`}
        description={
          <>
            {categoryLabel(item.category)}
            {item.partType &&
              ` (${PART_TYPES.find((p) => p.value === item.partType)?.label})`} ·{" "}
            {statusLabel(item.status)} · in {new Date(item.receivedAt).toLocaleDateString("en-IN")}
            {item.source.name && ` from ${item.source.name}`} · paid {formatPrice(item.buyPaise)} (
            {item.buyMode})
          </>
        }
        actions={item.grade && <GradeBadge grade={item.grade} />}
      />
      {msg && (
        <p role="status" className="mb-4 rounded-lg bg-grade-a-bg px-4 py-2 text-sm text-grade-a">
          {msg}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <GradePanel item={item} onSave={save} formId={formId} />

        <div className="space-y-6">
          {item.dataWipe.required && (
            <Panel title="Data wipe">
              {item.dataWipe.doneAt ? (
                <p className="text-sm text-grade-a">
                  Wiped ({item.dataWipe.method?.replace("_", " + ")}) on{" "}
                  {new Date(item.dataWipe.doneAt).toLocaleString("en-IN")}
                </p>
              ) : (
                <WipeForm
                  onDone={(method) =>
                    save(
                      withEvent(
                        { ...item, dataWipe: { required: true, method, doneAt: at() } },
                        "data_wiped",
                        method,
                      ),
                      "Data wipe recorded.",
                    )
                  }
                />
              )}
            </Panel>
          )}

          <ActionsPanel
            item={item}
            partners={partners}
            wipeDone={wipeDone}
            reload={reload}
            setMsg={setMsg}
          />

          <Panel title="Rack">
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Rack location</span>
                <Input defaultValue={item.rack} placeholder="e.g. A-2" id={`${formId}-rack`} />
              </label>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const el = document.getElementById(`${formId}-rack`) as HTMLInputElement | null;
                  void save({ ...item, rack: el?.value.trim() ?? "" }, "Rack saved.");
                }}
              >
                Save
              </Button>
            </div>
          </Panel>
        </div>

        {item.photos.length > 0 && (
          <Panel title="Photos">
            <div className="flex flex-wrap gap-3">
              {item.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL
                <img
                  key={i}
                  src={p}
                  alt={`${item.id} photo ${i + 1}`}
                  className="size-32 rounded-lg border border-line object-cover"
                />
              ))}
            </div>
          </Panel>
        )}

        <Panel title="History">
          <ol className="space-y-2 text-sm">
            {[...item.events].reverse().map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-36 shrink-0 text-xs text-muted tabular-nums">
                  {new Date(e.at).toLocaleString("en-IN")}
                </span>
                <span>
                  <span className="font-medium">{e.type.replace(/[_:]/g, " ")}</span>
                  {e.note && <span className="text-muted"> · {e.note}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

function GradePanel({
  item,
  onSave,
  formId,
}: {
  item: Item;
  onSave: (i: Item, note: string) => Promise<void>;
  formId: string;
}) {
  const tests = CHECKLISTS[item.category];
  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tests.map((t) => [t, item.checklist[t] ?? false])),
  );
  const [grade, setGrade] = useState<Grade | "">(item.grade ?? "");
  const [faults, setFaults] = useState(item.faults);
  const allPass = tests.every((t) => checks[t]);
  const locked = ["listed", "reserved", "sold", "handed_over", "stripped"].includes(item.status);

  return (
    <Panel title="Test and grade">
      <fieldset disabled={locked}>
        <legend className="sr-only">Test checklist</legend>
        <ul className="grid grid-cols-2 gap-2">
          {tests.map((t) => (
            <li key={t}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={checks[t] ?? false}
                  onChange={(e) => setChecks((c) => ({ ...c, [t]: e.target.checked }))}
                />
                {t}
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Grade"
            htmlFor={`${formId}-g`}
            hint={
              allPass
                ? "Everything passes: grade A."
                : "One fixable fault: B. Not worth fixing: C. Dead or hazardous: D."
            }
          >
            <Select
              id={`${formId}-g`}
              value={grade}
              onChange={(e) => setGrade(e.target.value as Grade)}
            >
              <option value="">Choose…</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}: {GRADE_INFO[g].short}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Faults found" htmlFor={`${formId}-f`}>
            <Input
              id={`${formId}-f`}
              value={faults}
              onChange={(e) => setFaults(e.target.value)}
              maxLength={200}
              placeholder="e.g. cracked screen"
            />
          </Field>
        </div>
        <Button
          className="mt-4"
          size="sm"
          disabled={!grade}
          onClick={() =>
            grade &&
            onSave(
              withEvent(
                {
                  ...item,
                  grade,
                  checklist: checks,
                  faults,
                  gradedAt: item.gradedAt ?? at(),
                  status: item.status === "received" ? "graded" : item.status,
                },
                "graded",
                `Grade ${grade}${faults ? `: ${faults}` : ""}`,
              ),
              `Saved as grade ${grade}.`,
            )
          }
        >
          Save grade
        </Button>
      </fieldset>
      {locked && (
        <p className="mt-3 text-xs text-muted">
          Grading is locked once an item is listed or has left the hub.
        </p>
      )}
    </Panel>
  );
}

function WipeForm({ onDone }: { onDone: (m: WipeMethod) => void }) {
  const [method, setMethod] = useState<WipeMethod>("reset_overwrite");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex-1">
        <span className="mb-1 block text-xs font-semibold text-ink-soft uppercase">Method</span>
        <Select value={method} onChange={(e) => setMethod(e.target.value as WipeMethod)}>
          <option value="reset_overwrite">Factory reset + overwrite</option>
          <option value="drive_wipe">Drive wipe</option>
          <option value="drilled">Drive drilled (wipe failed)</option>
        </Select>
      </label>
      <Button size="sm" onClick={() => onDone(method)}>
        Mark wiped
      </Button>
    </div>
  );
}

type ActionProps = {
  item: Item;
  partners: Partner[];
  wipeDone: boolean;
  reload: () => Promise<void>;
  setMsg: (m: string) => void;
};

function ActionsPanel({ item, partners, wipeDone, reload, setMsg }: ActionProps) {
  const [price, setPrice] = useState(
    paiseToRupeeInput(item.currentPaise ?? item.expectedResalePaise),
  );
  const [sold, setSold] = useState(paiseToRupeeInput(item.currentPaise));
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const [repair, setRepair] = useState({ partnerId: "", fault: item.faults, fee: "" });
  const [kg, setKg] = useState(item.weightKg ? String(item.weightKg) : "");
  const [parts, setParts] = useState<{ partType: PartType; title: string; price: string }[]>([]);

  const status = item.status;
  const g = item.grade;
  const go = async (s: Item["status"], note: string, patch: Partial<Item> = {}) => {
    if (Object.keys(patch).length) await saveItem({ ...item, ...patch });
    await setItemStatus(item.id, s, note);
    setMsg(note);
    await reload();
  };

  const canList =
    (g === "A" || g === "B" || g === "C") &&
    (status === "graded" || status === "stripping") &&
    !(g === "C" && item.category !== "part");

  return (
    <Panel title="Next step">
      {!g && <p className="text-sm text-muted">Grade the item first.</p>}

      {canList && (
        <div className="space-y-3">
          <Field
            label="List price (₹)"
            hint={
              item.expectedResalePaise
                ? `Expected resale: ${formatPrice(item.expectedResalePaise)}`
                : undefined
            }
          >
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          {!wipeDone && (
            <p className="text-sm text-grade-c">Record the data wipe before listing.</p>
          )}
          <Button
            size="sm"
            disabled={!wipeDone || !rupeesToPaiseOrNull(price)}
            onClick={() => {
              const p = rupeesToPaiseOrNull(price);
              if (p)
                void go("listed", `Listed at ${formatPrice(p)}`, { listPaise: p, currentPaise: p });
            }}
          >
            List online
          </Button>
          <p className="text-xs text-muted">
            Unsold after {BUSINESS_RULES.priceCut.afterDays} days: price cut 20% automatically.
            After {BUSINESS_RULES.downgradeToC.afterDays} days: downgraded to C.
          </p>
        </div>
      )}

      {g === "B" && status === "graded" && (
        <div className="mt-6 space-y-3 border-t border-line pt-4">
          <p className="text-sm font-semibold">Or send to a repair partner</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              aria-label="Repair partner"
              value={repair.partnerId}
              onChange={(e) => setRepair((r) => ({ ...r, partnerId: e.target.value }))}
            >
              <option value="">Partner shop…</option>
              {partners
                .filter((p) => p.isRepairPartner)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
            <Input
              aria-label="Fault"
              placeholder="Fault"
              value={repair.fault}
              onChange={(e) => setRepair((r) => ({ ...r, fault: e.target.value }))}
            />
            <Input
              aria-label="Fee (₹)"
              placeholder="Fee ₹"
              inputMode="decimal"
              value={repair.fee}
              onChange={(e) => setRepair((r) => ({ ...r, fee: e.target.value }))}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!repair.partnerId}
            onClick={async () => {
              await saveRepairJob({
                itemId: item.id,
                partnerId: repair.partnerId,
                fault: repair.fault,
                feePaise: rupeesToPaiseOrNull(repair.fee) ?? 0,
                sentAt: at(),
              });
              await go(
                "out_for_repair",
                `Sent to ${partners.find((p) => p.id === repair.partnerId)?.name ?? "partner"}`,
              );
            }}
          >
            Send for repair
          </Button>
        </div>
      )}

      {status === "out_for_repair" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void go("graded", "Back from repair: fixed")}>
            Back, fixed
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void go("stripping", "Back from repair: not fixable, downgraded to C", { grade: "C" })
            }
          >
            Not fixable → C
          </Button>
        </div>
      )}

      {g === "C" && item.category !== "part" && (status === "graded" || status === "stripping") && (
        <div className="space-y-3">
          <p className="text-sm">
            Remove good parts. Each becomes its own tagged item. The shell then goes to the scrap
            cage.
          </p>
          {parts.map((p, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[150px_1fr_110px_auto]">
              <Select
                aria-label="Part type"
                value={p.partType}
                onChange={(e) =>
                  setParts((ps) =>
                    ps.map((x, j) =>
                      j === i ? { ...x, partType: e.target.value as PartType } : x,
                    ),
                  )
                }
              >
                {PART_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Part description"
                placeholder="e.g. 8 GB DDR4"
                value={p.title}
                onChange={(e) =>
                  setParts((ps) =>
                    ps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                  )
                }
              />
              <Input
                aria-label="Price (₹)"
                placeholder="Price ₹"
                inputMode="decimal"
                value={p.price}
                onChange={(e) =>
                  setParts((ps) =>
                    ps.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)),
                  )
                }
              />
              <button
                type="button"
                aria-label="Remove part"
                onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))}
                className="grid size-10 place-items-center rounded-lg text-muted hover:bg-sunken"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setParts((ps) => [...ps, { partType: "ram", title: "", price: "" }])}
            >
              <Plus className="size-4" aria-hidden="true" /> Add part
            </Button>
            <label className="flex items-center gap-2 text-sm">
              Shell weight (kg)
              <input
                className={`${hubInput} w-24`}
                inputMode="decimal"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
              />
            </label>
            <Button
              size="sm"
              onClick={async () => {
                for (const p of parts.filter((x) => x.title.trim())) {
                  await createItem({
                    receivedAt: at(),
                    source: { type: "stripped", name: item.id },
                    category: "part",
                    partType: p.partType,
                    brand: item.brand,
                    model: p.title.trim(),
                    description: `Removed from ${item.id} (${[item.brand, item.model].filter(Boolean).join(" ")}).`,
                    photos: [],
                    hasBattery: p.partType === "battery",
                    grade: "C",
                    checklist: { "Tested working": true },
                    faults: "",
                    dataWipe: { required: p.partType === "storage" },
                    rack: "",
                    buyMode: "free",
                    buyPaise: 0,
                    expectedResalePaise: rupeesToPaiseOrNull(p.price),
                    parentId: item.id,
                  });
                }
                await saveItem({
                  ...item,
                  status: "in_scrap_cage",
                  grade: "D",
                  weightKg: kg ? Number(kg) : item.weightKg,
                  events: [
                    ...item.events,
                    {
                      at: at(),
                      type: "stripped",
                      note: `${parts.length} part(s) removed; shell to scrap cage`,
                    },
                  ],
                });
                setParts([]);
                setMsg("Parts tagged. Shell moved to the scrap cage.");
                await reload();
              }}
            >
              Save parts, shell to scrap
            </Button>
          </div>
        </div>
      )}

      {g === "D" && status !== "in_scrap_cage" && status !== "handed_over" && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Weight (kg)">
            <Input
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              className="w-28"
            />
          </Field>
          <Button
            size="sm"
            onClick={() =>
              void go("in_scrap_cage", `Into scrap cage${kg ? ` (${kg} kg)` : ""}`, {
                weightKg: kg ? Number(kg) : undefined,
              })
            }
          >
            Move to scrap cage
          </Button>
        </div>
      )}
      {status === "in_scrap_cage" && (
        <p className="text-sm">
          In the scrap cage{item.weightKg ? ` (${item.weightKg} kg)` : ""}. Record the pickup under{" "}
          <Link href="/hub/handovers" className="text-brand-600 underline">
            Recycler handovers
          </Link>
          .
        </p>
      )}

      {(status === "listed" || status === "reserved") && (
        <div className="space-y-3">
          <p className="text-sm">
            Listed at <strong>{formatPrice(item.currentPaise)}</strong>
            {item.priceCutAt && ` (cut from ${formatPrice(item.listPaise)})`} since{" "}
            {item.listedAt && new Date(item.listedAt).toLocaleDateString("en-IN")}.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              aria-label="Sold for (₹)"
              inputMode="decimal"
              value={sold}
              onChange={(e) => setSold(e.target.value)}
            />
            <Select
              aria-label="Fulfilment"
              value={fulfilment}
              onChange={(e) => setFulfilment(e.target.value as Fulfilment)}
            >
              <option value="pickup">Hub pickup</option>
              <option value="delivery_jammu">Jammu delivery (₹50)</option>
              <option value="ship_india">Shipped (buyer paid)</option>
            </Select>
            <Button
              size="sm"
              onClick={() =>
                void go(
                  "sold",
                  `Sold for ${formatPrice(rupeesToPaiseOrNull(sold) ?? 0)} (${fulfilment.replace("_", " ")})`,
                  { currentPaise: rupeesToPaiseOrNull(sold) ?? item.currentPaise, fulfilment },
                )
              }
            >
              Mark sold
            </Button>
          </div>
          <div className="flex gap-2">
            {status === "listed" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void go("reserved", "Reserved for a buyer")}
              >
                Mark reserved
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void go("listed", "Reservation cancelled")}
              >
                Cancel reservation
              </Button>
            )}
          </div>
        </div>
      )}

      {(status === "sold" || status === "handed_over" || status === "stripped") && (
        <p className="text-sm text-muted">This item has left the hub.</p>
      )}
    </Panel>
  );
}
