"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useEffect, useState } from "react";
import { myNotifications, type Notification } from "@/features/account/api";
import { markRead, useNotifications } from "@/features/account/notifications-store";
import { RequireAccount } from "@/features/account/RequireAccount";
import { cn } from "@/lib/utils/cn";

export default function NotificationsPage() {
  return (
    <RequireAccount>
      {() => (
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>My ReLoop</Eyebrow>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Notifications</h1>
            <p className="mt-2 text-muted">
              Updates on your requests, offers and account. ReLoop sends no email: they appear here
              and on the bell at the top. They are deleted after 90 days.
            </p>
            <List />
          </div>
        </Container>
      )}
    </RequireAccount>
  );
}

/**
 * Up to 200 (everything from the last 90 days for nearly everyone), loaded
 * here; the shared list behind the bell holds only the latest 20, and keeps
 * read marks in step.
 */
function List() {
  const latest = useNotifications();
  const [all, setAll] = useState<Notification[] | null>(null);
  useEffect(() => {
    let alive = true;
    myNotifications(200)
      .then((n) => alive && setAll(n))
      .catch(() => alive && setAll([]));
    return () => {
      alive = false;
    };
  }, []);
  const readNow = new Set(latest?.filter((n) => n.read_at).map((n) => n.id));
  const [allRead, setAllRead] = useState(false);
  const list =
    all?.map((n) =>
      n.read_at || allRead || readNow.has(n.id) ? { ...n, read_at: n.read_at ?? "now" } : n,
    ) ?? null;
  const unread = list?.filter((n) => !n.read_at).length ?? 0;
  if (!list)
    return (
      <p role="status" className="mt-6 text-muted">
        Loading…
      </p>
    );
  if (list.length === 0) return <p className="mt-6 text-muted">Nothing yet.</p>;
  return (
    <>
      {unread > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-6"
          onClick={() => void markRead().then(() => setAllRead(true))}
        >
          Mark all {unread} as read
        </Button>
      )}
      <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-surface">
        {list.map((n) => (
          <li key={n.id} className={cn("p-4", !n.read_at && "bg-brand-50/50")}>
            <p className="flex flex-wrap justify-between gap-2">
              <span className="font-semibold text-ink">
                {!n.read_at && <span className="sr-only">Unread: </span>}
                {n.title}
              </span>
              <span className="text-xs text-muted">
                {new Date(n.created_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            </p>
            {n.body && <p className="mt-1 text-sm text-ink-soft">{n.body}</p>}
            {n.href && (
              <Link
                href={n.href}
                onClick={() => !n.read_at && void markRead([n.id])}
                className="mt-2 inline-block text-sm font-semibold text-brand-600 underline"
              >
                Open
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
