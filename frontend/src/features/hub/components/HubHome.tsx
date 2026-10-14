"use client";

import { AlertTriangle, ArrowRight, CircleCheck, PackagePlus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { hubAlerts, stockRulesDue } from "@/features/inventory/rules";
import { SHARED_DATABASE } from "@/features/inventory/store";
import { useAccess } from "@/lib/use-access";
import { cn } from "@/lib/utils/cn";
import { useHubBadges } from "../badges";
import type { HubBadges } from "../tools";
import { useHubData } from "../useHubData";
import { PageTitle, Panel } from "./ui";

export type Todo = {
  key: string;
  count: number;
  label: string;
  href: string;
  /** "act": overdue or blocking; "check": waiting for someone. */
  level: "act" | "check";
  ids?: string[];
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** The queues from hub_badges(), as to-dos (only the ones with something waiting). */
export function queueTodos(b: HubBadges | null): Todo[] {
  if (!b) return [];
  const todos: Todo[] = [
    {
      key: "pending_shops",
      count: b.pending_shops ?? 0,
      label: plural(
        b.pending_shops ?? 0,
        "shop waiting for verification",
        "shops waiting for verification",
      ),
      href: "/hub/shops",
      level: "act",
    },
    {
      key: "deletion_requests",
      count: b.deletion_requests ?? 0,
      label: plural(
        b.deletion_requests ?? 0,
        "account deletion request (answer within 30 days)",
        "account deletion requests (answer within 30 days)",
      ),
      href: "/hub/deletions",
      level: "act",
    },
    {
      key: "new_submissions",
      count: b.new_submissions,
      label: plural(
        b.new_submissions,
        "new shop submission to review",
        "new shop submissions to review",
      ),
      href: "/hub/submissions",
      level: "act",
    },
    {
      key: "pickups_next",
      count: b.pickups_next,
      label: plural(
        b.pickups_next,
        "pickup on the next route day",
        "pickups on the next route day",
      ),
      href: "/hub/submissions",
      level: "act",
    },
    {
      key: "offers_accepted",
      count: b.offers_accepted,
      label: plural(
        b.offers_accepted,
        "accepted offer to collect and turn into hub items",
        "accepted offers to collect and turn into hub items",
      ),
      href: "/hub/submissions",
      level: "act",
    },
    {
      key: "payouts_due",
      count: b.payouts_due,
      label: plural(
        b.payouts_due,
        "bought lot to record the payment for",
        "bought lots to record the payment for",
      ),
      href: "/hub/submissions",
      level: "act",
    },
    {
      key: "offers_waiting",
      count: b.offers_waiting,
      label: plural(
        b.offers_waiting,
        "offer waiting for the shop's answer",
        "offers waiting for the shops' answers",
      ),
      href: "/hub/submissions",
      level: "check",
    },
    {
      key: "new_reservations",
      count: b.new_reservations,
      label: plural(b.new_reservations, "new reservation", "new reservations"),
      href: "/hub/requests",
      level: "act",
    },
    {
      key: "new_institution_pickups",
      count: b.new_institution_pickups,
      label: plural(
        b.new_institution_pickups,
        "institution pickup to schedule",
        "institution pickups to schedule",
      ),
      href: "/hub/requests",
      level: "act",
    },
    {
      key: "new_questions",
      count: b.new_questions,
      label: plural(b.new_questions, "question to answer", "questions to answer"),
      href: "/hub/requests",
      level: "act",
    },
  ];
  return todos.filter((t) => t.count > 0);
}

/** Stock to-dos: overdue grading or listing, scrap and batteries, and the stock rules due this week. */
export function stockTodos(
  items: Parameters<typeof hubAlerts>[0],
  handovers: Parameters<typeof hubAlerts>[1],
  now: Date,
): Todo[] {
  const due = stockRulesDue(items, now);
  return [
    // The day-45 reminder is listed below with the day-75 one (stockRulesDue).
    ...hubAlerts(items, handovers, now)
      .filter((al) => al.key !== "price_cut_soon")
      .map((al) => ({
        key: `alert-${al.key}`,
        count: al.itemIds?.length ?? 1,
        label: al.message,
        href: "/hub/items",
        level: al.level === "act" ? ("act" as const) : ("check" as const),
        ids: al.itemIds,
      })),
    ...(due.priceCut.length
      ? [
          {
            key: "price-cut",
            count: due.priceCut.length,
            label: `${due.priceCut.length} listed ${plural(due.priceCut.length, "item reaches", "items reach")} the day-45 price cut this week`,
            href: "/hub/items?status=listed",
            level: "check" as const,
            ids: due.priceCut,
          },
        ]
      : []),
    ...(due.downgrade.length
      ? [
          {
            key: "downgrade",
            count: due.downgrade.length,
            label: `${due.downgrade.length} listed ${plural(due.downgrade.length, "item reaches", "items reach")} day 75 (downgrade to C for parts) this week`,
            href: "/hub/items?status=listed",
            level: "act" as const,
            ids: due.downgrade,
          },
        ]
      : []),
  ];
}

/** Today's to-dos: what is waiting in the shared queues, and what the stock rules say. */
export function HubHome() {
  const { items, handovers, loaded } = useHubData();
  const badges = useHubBadges();
  const a = useAccess();
  const name = a.state === "ready" ? a.access?.name?.split(" ")[0] : undefined;
  const now = new Date();
  const stock = stockTodos(items, handovers, now);
  const queues = queueTodos(badges);
  const waiting = SHARED_DATABASE && badges === null;

  return (
    <>
      <PageTitle
        title={name ? `Good to see you, ${name}` : "Overview"}
        description={now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/hub/intake" className={buttonClasses({ size: "sm" })}>
              <PackagePlus className="size-4" aria-hidden="true" /> Log new item
            </Link>
            <Link href="/hub/kpis" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              KPIs
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Requests and submissions">
          {!SHARED_DATABASE ? (
            <p className="text-sm text-muted">
              Requests and shop submissions arrive in the shared database. This laptop keeps hub
              data on this device only.
            </p>
          ) : waiting ? (
            <p role="status" className="text-sm text-muted">
              Loading the queues…
            </p>
          ) : (
            <TodoList todos={queues} empty="Nothing waiting from the site or partner shops." />
          )}
        </Panel>
        <Panel title="Stock">
          {!loaded ? (
            <p role="status" className="text-sm text-muted">
              Loading items…
            </p>
          ) : (
            <TodoList todos={stock} empty="No stock rule or handover needs you today." />
          )}
        </Panel>
      </div>
    </>
  );
}

function TodoList({ todos, empty }: { todos: Todo[]; empty: string }) {
  if (!todos.length)
    return (
      <p className="flex items-center gap-2 text-sm text-success">
        <CircleCheck className="size-4" aria-hidden="true" /> {empty}
      </p>
    );
  return (
    <ul className="space-y-2">
      {todos.map((t) => (
        <li key={t.key}>
          <Link
            href={t.href}
            className={cn(
              "flex items-start gap-3 rounded-lg p-3 text-sm transition hover:ring-2 hover:ring-brand-600/30",
              t.level === "act" ? "bg-warning-bg text-warning" : "bg-info-bg text-info",
            )}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {/* Queue labels say the count after it; stock alerts already include it. */}
              {t.key.startsWith("alert-") || t.key === "price-cut" || t.key === "downgrade" ? (
                t.label
              ) : (
                <>
                  <strong className="tabular-nums">{t.count}</strong> {t.label}
                </>
              )}
              {t.ids && t.ids.length <= 6 && (
                <span className="mt-1 block font-mono text-xs opacity-80">{t.ids.join(" · ")}</span>
              )}
            </span>
            <ArrowRight className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
