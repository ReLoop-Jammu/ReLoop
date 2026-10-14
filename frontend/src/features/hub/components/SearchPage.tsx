"use client";

import Form from "next/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { useAccess } from "@/lib/use-access";
import { listUsers, type AdminUserRow } from "../admin-users";
import { searchHub, type SearchHit } from "../search";
import { listShopOwners, type ShopOwner } from "../shop-reviews";
import { useHubData } from "../useHubData";
import { Input, PageTitle, Panel } from "./ui";

export function SearchPage() {
  return (
    <>
      <PageTitle
        title="Search"
        description="Find an item by its RL-JMU tag, a shop, an institution or an account."
      />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Search />
      </Suspense>
    </>
  );
}

const KIND: Record<SearchHit["kind"], string> = {
  item: "Items",
  partner: "Shops",
  institution: "Institutions",
};

function Search() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const data = useHubData();
  const a = useAccess();
  const admin = SHARED_DATABASE && a.state === "ready" && Boolean(a.access?.is_admin);
  const hits = searchHub(q, data);

  return (
    <div className="grid gap-6">
      <Form action="/hub/search" role="search" className="flex max-w-xl gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search the hub
        </label>
        <Input
          id="search-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="RL-JMU-0042, Sharma, a college…"
        />
        <Button type="submit" size="sm">
          Search
        </Button>
      </Form>
      {!q ? (
        <p className="text-sm text-muted">
          Type a tag (or just its number), a brand, a shop or a name.
        </p>
      ) : (
        <>
          {!data.loaded ? (
            <p role="status" className="text-sm text-muted">
              Searching…
            </p>
          ) : (
            (["item", "partner", "institution"] as const).map((kind) => {
              const found = hits.filter((h) => h.kind === kind);
              return (
                <Panel key={kind} title={`${KIND[kind]} (${found.length})`}>
                  {found.length === 0 ? (
                    <p className="text-sm text-muted">
                      No {KIND[kind].toLowerCase()} match “{q}”.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {found.map((h) => (
                        <li key={h.id}>
                          <Link
                            href={h.href}
                            className="flex flex-wrap gap-x-3 py-2 text-sm hover:text-brand-600"
                          >
                            <span
                              className={
                                kind === "item" ? "font-mono font-semibold" : "font-semibold"
                              }
                            >
                              {h.title}
                            </span>
                            <span className="text-muted">{h.detail}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              );
            })
          )}
          {admin && <AccountResults q={q} />}
        </>
      )}
    </div>
  );
}

/** Accounts and partner-shop accounts (admins only: these hold contact details). */
function AccountResults({ q }: { q: string }) {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [shops, setShops] = useState<ShopOwner[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    Promise.all([listUsers(q), listShopOwners()])
      .then(([u, s]) => {
        if (!alive) return;
        setUsers(u.slice(0, 20));
        const needle = q.toLowerCase();
        setShops(
          s
            .filter((x) => `${x.shop_name} ${x.owner_name}`.toLowerCase().includes(needle))
            .slice(0, 20),
        );
      })
      .catch(
        (e: unknown) =>
          alive && setError(e instanceof Error ? e.message : "Couldn't search accounts."),
      );
    return () => {
      alive = false;
    };
  }, [q]);
  return (
    <Panel title="Accounts">
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : !users || !shops ? (
        <p role="status" className="text-sm text-muted">
          Searching accounts…
        </p>
      ) : users.length + shops.length === 0 ? (
        <p className="text-sm text-muted">No accounts match “{q}”.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {shops.map((s) => (
            <li key={`shop-${s.id}`}>
              <Link href="/hub/shops" className="flex flex-wrap gap-x-3 py-2 hover:text-brand-600">
                <span className="font-semibold">{s.shop_name}</span>
                <span className="text-muted">Partner shop account · {s.verification_status}</span>
              </Link>
            </li>
          ))}
          {users.map((u) => (
            <li key={u.id}>
              <Link href="/hub/users" className="flex flex-wrap gap-x-3 py-2 hover:text-brand-600">
                <span className="font-semibold">{u.name || u.email}</span>
                <span className="text-muted">
                  {u.isAdmin
                    ? "Admin"
                    : u.isStaff
                      ? "Hub staff"
                      : u.role === "shop_owner"
                        ? "Shop owner"
                        : "Buyer"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
