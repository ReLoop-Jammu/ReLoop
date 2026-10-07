"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { Institution, Partner } from "@/features/inventory/model";
import { saveInstitution, savePartner } from "@/features/inventory/store";
import { useHubData } from "../useHubData";
import { Field, Input, PageTitle, Panel, Select } from "./ui";

const MARKETS = ["Raghunath Bazaar", "Residency Road", "Gandhi Nagar", "Other"];

const blankPartner = (): Omit<Partner, "id"> => ({
  type: "repair_shop",
  name: "",
  owner: "",
  phone: "",
  market: MARKETS[0],
  routeDay: "tue",
  isRepairPartner: false,
  status: "lead",
  joinedAt: new Date().toISOString(),
  notes: "",
});

const blankInstitution = (): Omit<Institution, "id"> => ({
  name: "",
  type: "college",
  contactName: "",
  phone: "",
  email: "",
  isAnchor: false,
  notes: "",
});

export function PartnersPage() {
  const { partners, institutions, items, refresh } = useHubData();
  const [p, setP] = useState(blankPartner);
  const [inst, setInst] = useState(blankInstitution);
  const [editing, setEditing] = useState<string | null>(null);

  const itemsFrom = (key: "partnerId" | "institutionId", id: string) =>
    items.filter((i) => i.source[key] === id).length;

  const submitPartner = async (e: FormEvent) => {
    e.preventDefault();
    if (!p.name.trim() || !p.phone.trim()) return;
    await savePartner({ ...p, ...(editing && { id: editing }) });
    setP(blankPartner());
    setEditing(null);
    await refresh();
  };

  const submitInstitution = async (e: FormEvent) => {
    e.preventDefault();
    if (!inst.name.trim()) return;
    await saveInstitution(inst);
    setInst(blankInstitution());
    await refresh();
  };

  return (
    <>
      <PageTitle
        title="Shops & institutions"
        description="Who we collect from. Target: 25 active partner shops on the Tuesday/Friday route."
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Panel
          title={`Partner shops (${partners.filter((x) => x.status === "active").length} active)`}
          className="overflow-x-auto"
        >
          {partners.length === 0 ? (
            <p className="text-sm text-muted">No shops yet.</p>
          ) : (
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th scope="col" className="py-2 font-medium">
                    Shop
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Market · day
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Items
                  </th>
                  <th scope="col" className="py-2">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {partners.map((x) => (
                  <tr key={x.id}>
                    <td className="py-2">
                      <span className="font-medium">{x.name}</span>
                      <span className="block text-xs text-muted">
                        {x.owner} · {x.phone}
                        {x.isRepairPartner && " · repair partner"}
                      </span>
                    </td>
                    <td className="py-2">
                      {x.market} ·{" "}
                      {x.routeDay === "tue" ? "Tue" : x.routeDay === "fri" ? "Fri" : "–"}
                    </td>
                    <td className="py-2 capitalize">{x.status}</td>
                    <td className="py-2 text-right tabular-nums">{itemsFrom("partnerId", x.id)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="text-brand-600 underline"
                        onClick={() => {
                          const { id, ...rest } = x;
                          setEditing(id);
                          setP(rest);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title={editing ? "Edit shop" : "Add a shop"}>
          <form onSubmit={submitPartner} className="grid gap-3">
            <Field label="Shop name">
              <Input
                required
                value={p.name}
                onChange={(e) => setP({ ...p, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Owner">
                <Input value={p.owner} onChange={(e) => setP({ ...p, owner: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input
                  required
                  type="tel"
                  value={p.phone}
                  onChange={(e) => setP({ ...p, phone: e.target.value })}
                />
              </Field>
              <Field label="Type">
                <Select
                  value={p.type}
                  onChange={(e) => setP({ ...p, type: e.target.value as Partner["type"] })}
                >
                  <option value="repair_shop">Repair shop</option>
                  <option value="retailer">Retailer</option>
                </Select>
              </Field>
              <Field label="Market">
                <Select value={p.market} onChange={(e) => setP({ ...p, market: e.target.value })}>
                  {MARKETS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Route day">
                <Select
                  value={p.routeDay}
                  onChange={(e) => setP({ ...p, routeDay: e.target.value as Partner["routeDay"] })}
                >
                  <option value="tue">Tuesday</option>
                  <option value="fri">Friday</option>
                  <option value="">Not on route</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={p.status}
                  onChange={(e) => setP({ ...p, status: e.target.value as Partner["status"] })}
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={p.isRepairPartner}
                onChange={(e) => setP({ ...p, isRepairPartner: e.target.checked })}
              />
              Repairs our grade-B items (fixed fee per job)
            </label>
            <Field label="Notes">
              <Input value={p.notes} onChange={(e) => setP({ ...p, notes: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                {editing ? "Save changes" : "Add shop"}
              </Button>
              {editing && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => (setEditing(null), setP(blankPartner()))}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Panel>

        <Panel title={`Institutions (${institutions.length})`} className="overflow-x-auto">
          {institutions.length === 0 ? (
            <p className="text-sm text-muted">
              No institutions yet. The plan starts with three anchor campuses.
            </p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {institutions.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium">{i.name}</span>
                    {i.isAnchor && (
                      <span className="ml-2 rounded bg-gold-100 px-1.5 text-xs text-gold-700">
                        Anchor
                      </span>
                    )}
                    <span className="block text-xs text-muted">
                      {i.contactName} · {i.phone} {i.email && `· ${i.email}`}
                    </span>
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {itemsFrom("institutionId", i.id)} items
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Add an institution">
          <form onSubmit={submitInstitution} className="grid gap-3">
            <Field label="Name">
              <Input
                required
                value={inst.name}
                onChange={(e) => setInst({ ...inst, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select
                  value={inst.type}
                  onChange={(e) =>
                    setInst({ ...inst, type: e.target.value as Institution["type"] })
                  }
                >
                  <option value="college">College</option>
                  <option value="school">School</option>
                  <option value="bank">Bank</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Contact person">
                <Input
                  value={inst.contactName}
                  onChange={(e) => setInst({ ...inst, contactName: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  value={inst.phone}
                  onChange={(e) => setInst({ ...inst, phone: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={inst.email}
                  onChange={(e) => setInst({ ...inst, email: e.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={inst.isAnchor}
                onChange={(e) => setInst({ ...inst, isAnchor: e.target.checked })}
              />
              Anchor institution
            </label>
            <Button type="submit" size="sm">
              Add institution
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
