"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { useDisclosure } from "@/components/layout/use-disclosure";
import { cn } from "@/lib/utils/cn";
import { markRead, useNotifications } from "./notifications-store";

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** The bell in the header: unread count, the latest few, and a link to all of them. */
export function NotificationBell() {
  const list = useNotifications();
  const { open, root, button, toggle } = useDisclosure();
  const panelId = useId();
  const unread = list?.filter((n) => !n.read_at).length ?? 0;
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="relative grid size-11 place-items-center rounded-full text-ink-soft hover:bg-sunken"
      >
        <Bell className="size-5" aria-hidden="true" />
        <span className="sr-only">Notifications{unread ? `: ${unread} unread` : ""}</span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-surface p-2 shadow-lift"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markRead()}
              className="text-xs font-semibold text-brand-600 underline"
            >
              Mark all read
            </button>
          )}
        </div>
        {!list ? (
          <p className="px-3 py-2 text-sm text-muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted">
            Nothing yet. Updates on your requests and offers appear here.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto border-t border-line pt-1 text-sm">
            {list.slice(0, 5).map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href ?? "/account/notifications"}
                  onClick={() => !n.read_at && void markRead([n.id])}
                  className={cn(
                    "block rounded-lg px-3 py-2 hover:bg-sunken",
                    !n.read_at && "bg-brand-50/60",
                  )}
                >
                  <span className="block font-medium text-ink">{n.title}</span>
                  {n.body && <span className="block text-muted">{n.body}</span>}
                  <span className="text-xs text-muted">{ago(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/account/notifications"
          className="mt-1 block rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-sunken"
        >
          See all notifications
        </Link>
      </div>
    </div>
  );
}
