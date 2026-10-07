"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import {
  GRADES,
  STATUSES,
  categoryLabel,
  statusLabel,
  type ItemStatus,
} from "@/features/inventory/model";
import { daysBetween } from "@/features/inventory/rules";
import { formatPrice } from "@/lib/utils/money";
import { useHubData } from "../useHubData";
import { PageTitle, Panel, Select, hubInput } from "./ui";

export function ItemList() {
  const { items, loaded } = useHubData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get("status") ?? "";
  const grade = params.get("grade") ?? "";
  const q = (params.get("q") ?? "").toLowerCase();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next}`);
  };

  const now = new Date();
  const list = items.filter(
    (i) =>
      (!status || i.status === status) &&
      (!grade || (grade === "none" ? i.grade === null : i.grade === grade)) &&
      (!q || `${i.id} ${i.brand} ${i.model} ${i.source.name ?? ""}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageTitle title="Items" description={`${items.length} items logged on this device`} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px_160px]">
        <label className="relative">
          <span className="sr-only">Search by tag, brand, model or source</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            defaultValue={params.get("q") ?? ""}
            placeholder="Search tag, brand, model, source…"
            onChange={(e) => update("q", e.target.value)}
            className={`${hubInput} pl-9`}
          />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <Select value={status} onChange={(e) => update("status", e.target.value)}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="sr-only">Grade</span>
          <Select value={grade} onChange={(e) => update("grade", e.target.value)}>
            <option value="">Any grade</option>
            <option value="none">Not graded</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <Panel className="overflow-x-auto p-0">
        {!loaded ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-5 text-sm text-muted">No items match.</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-sunken text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Tag
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Item
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Grade
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Price
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Age
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((i) => (
                <tr key={i.id} className="hover:bg-sunken/60">
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <Link
                      href={`/hub/items/${i.id}`}
                      className="font-semibold text-brand-600 hover:underline"
                    >
                      {i.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-ink">
                      {[i.brand, i.model].filter(Boolean).join(" ")}
                    </span>
                    <span className="block text-xs text-muted">
                      {categoryLabel(i.category)}
                      {i.source.name && ` · from ${i.source.name}`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {i.grade ? (
                      <GradeBadge grade={i.grade} size="sm" withLabel={false} />
                    ) : (
                      <span className="text-xs text-muted">–</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{statusLabel(i.status as ItemStatus)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {i.currentPaise ? formatPrice(i.currentPaise) : "–"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-muted tabular-nums">
                    {daysBetween(i.receivedAt, now)} d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
