"use client";

import {
  BadgeCheck,
  Bell,
  Inbox,
  UserCog,
  Clock,
  Heart,
  HelpCircle,
  KeyRound,
  LogOut,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Notice } from "@/components/ui/Notice";
import { MySubmissions } from "@/features/account/MySubmissions";
import { MyPartnership } from "@/features/account/MyPartnership";
import { MyWeighins } from "@/features/account/MyWeighins";
import { useNotifications } from "@/features/account/notifications-store";
import { useHubBadges } from "@/features/hub/badges";
import { badgeCount, TOOL_GROUPS, toolsFor } from "@/features/hub/tools";
import { useSiteSettings } from "@/features/settings/context";
import { whatsappChatUrl } from "@/features/sell/components/WhatsAppButton";
import {
  authenticatedFetch,
  CHANGE_PASSWORD_PATH,
  getSession,
  logoutAccount,
  type Access,
} from "@/lib/auth-client";
import { IS_SIMULATION } from "@/lib/environment";
import { roleLabel, useAccess } from "@/lib/use-access";

type ShopProfile = { shop_name: string; gstin: string | null };

export default function AccountPage() {
  const a = useAccess();
  const access = a.state === "ready" ? a.access : null;

  useEffect(() => {
    // The first render after loading the page always reads as signed out (it
    // matches the server's HTML), so check the stored session itself.
    if (a.state === "signed-out" && !getSession()?.access_token)
      window.location.replace("/login?next=%2Faccount");
    if (access?.must_change_password) window.location.replace(CHANGE_PASSWORD_PATH);
  }, [a.state, access?.must_change_password]);

  async function signOut() {
    await logoutAccount();
    window.location.replace("/?signed-out=1");
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Eyebrow>My ReLoop</Eyebrow>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          {access?.name ? `Welcome, ${access.name}` : "Your account"}
        </h1>
        {a.state !== "ready" ? (
          <p role="status" className="mt-6 text-muted">
            Loading your account…
          </p>
        ) : !access ? (
          <Notice tone="danger" role="alert" title="Your account couldn't load" className="mt-6">
            Check your connection and reload the page. If it keeps happening, log out and in again.
          </Notice>
        ) : (
          <>
            <p className="mt-2 text-muted">{roleLabel(access)}</p>
            {(access.is_staff || access.is_admin) && <HubTools access={access} />}
            {access.role === "shop_owner" && <ShopOwner access={access} />}
            {!access.is_staff && !access.is_admin && access.role !== "shop_owner" && <Buyer />}
            <AccountLinks />
          </>
        )}
        <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
          <ButtonLink href={CHANGE_PASSWORD_PATH} variant="secondary">
            <KeyRound className="size-4" aria-hidden="true" /> Change password
          </ButtonLink>
          <Button variant="ghost" onClick={() => void signOut()}>
            <LogOut className="size-4" aria-hidden="true" /> Log out
          </Button>
        </div>
      </div>
    </Container>
  );
}

/** Staff and admins: a card per hub tool they may use, grouped like the hub menu. */
function HubTools({ access }: { access: Access }) {
  const tools = toolsFor(access);
  const badges = useHubBadges();
  return (
    <section aria-labelledby="tools-heading" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="tools-heading" className="text-xl font-bold">
          Your hub tools
        </h2>
        <ButtonLink href="/hub" size="sm">
          Open the hub
        </ButtonLink>
      </div>
      {TOOL_GROUPS.map((group) => {
        const inGroup = tools.filter((t) => t.group === group);
        if (!inGroup.length) return null;
        return (
          <div key={group} className="mt-6">
            <h3 className="text-sm font-semibold text-ink-soft">{group}</h3>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inGroup.map(({ href, label, description, icon: Icon, badge }) => {
                const count = badgeCount({ badge }, badges);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex h-full gap-3 rounded-card border border-line bg-surface p-4 transition hover:border-brand-600/40 hover:shadow-sm"
                    >
                      <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold text-ink">
                          {label}
                          {count ? (
                            <span className="rounded-full bg-gold-400 px-1.5 text-xs text-brand-950 tabular-nums">
                              <span aria-hidden="true">{count}</span>
                              <span className="sr-only">, {count} waiting</span>
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm text-muted">{description}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

const SHOP_STATUS: Record<
  "pending" | "verified" | "rejected",
  { icon: LucideIcon; title: string; tone: "info" | "success" | "danger" }
> = {
  pending: { icon: Clock, title: "We're checking your shop", tone: "info" },
  verified: { icon: BadgeCheck, title: "Your shop is verified", tone: "success" },
  rejected: { icon: XCircle, title: "We couldn't verify your shop", tone: "danger" },
};

/** Shop owners: where verification stands, what to do next, and their submissions. */
function ShopOwner({ access }: { access: Access }) {
  const { whatsapp } = useSiteSettings();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  useEffect(() => {
    const id = getSession()?.user.id;
    if (!id) return;
    let alive = true;
    authenticatedFetch(`/rest/v1/shop_owners?select=shop_name,gstin&id=eq.${id}`)
      .then((r) => (r.ok ? (r.json() as Promise<ShopProfile[]>) : []))
      .then((rows) => alive && setShop(rows[0] ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const status = access.shop_status ?? "pending";
  const s = SHOP_STATUS[status];
  const chat =
    !IS_SIMULATION && whatsapp
      ? whatsappChatUrl(
          `Hello ReLoop, about my shop account${shop?.shop_name ? ` (${shop.shop_name})` : ""}.`,
          whatsapp,
        )
      : null;
  return (
    <section aria-labelledby="shop-heading" className="mt-8 grid gap-6">
      <div className="rounded-card border border-line bg-surface p-6">
        <s.icon
          className={
            status === "verified"
              ? "size-6 text-success"
              : status === "rejected"
                ? "size-6 text-danger"
                : "size-6 text-info"
          }
          aria-hidden="true"
        />
        <h2 id="shop-heading" className="mt-3 text-xl font-bold">
          {s.title}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {shop?.shop_name || "Your shop"} · GSTIN: {shop?.gstin || "not GST-registered"}
        </p>
        {status === "pending" && (
          <div className="mt-4 grid gap-2 text-sm text-ink-soft">
            <p>
              A ReLoop admin checks your shop&apos;s details and may call you on the number you
              signed up with. You can submit items once your shop is verified.
            </p>
            <p>Meanwhile, see what we buy and how the pickup route works.</p>
          </div>
        )}
        {status === "rejected" && (
          <p className="mt-4 text-sm text-ink-soft">
            Message us and we&apos;ll tell you why and what to send, then check your shop again.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {status === "verified" ? (
            <>
              <ButtonLink href="/sell/shops">Offer devices to ReLoop</ButtonLink>
              <ButtonLink href="/account/parts" variant="secondary">
                Parts Exchange
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href="/what-we-accept" variant="secondary">
              What we accept
            </ButtonLink>
          )}
          {status !== "verified" && chat && (
            <ButtonLink href={chat} variant="secondary" target="_blank" rel="noopener noreferrer">
              Message ReLoop on WhatsApp
            </ButtonLink>
          )}
          <ButtonLink href="/help" variant="ghost">
            <HelpCircle className="size-4" aria-hidden="true" /> Help, in English and Hindi
          </ButtonLink>
        </div>
      </div>
      <div className="mb-6 rounded-card border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">Your partnership</h2>
        <MyPartnership />
      </div>
      {/* Every shop owner sees what they sent before, verified or not. */}
      <div className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">My submissions</h2>
        <MySubmissions />
      </div>
      <div className="mt-6 rounded-card border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">My scrap weigh-ins</h2>
        <MyWeighins />
      </div>
    </section>
  );
}

/** Everyone: requests, notifications and their own details. */
function AccountLinks() {
  const notes = useNotifications();
  const unread = notes?.filter((n) => !n.read_at).length ?? 0;
  const links: { href: string; icon: LucideIcon; title: string; body: string }[] = [
    {
      href: "/account/requests",
      icon: Inbox,
      title: "My requests",
      body: "Reservations, questions and pickups you sent while logged in, and where they stand.",
    },
    {
      href: "/account/notifications",
      icon: Bell,
      title: unread ? `Notifications (${unread} unread)` : "Notifications",
      body: "Updates on your requests, offers and account.",
    },
    {
      href: "/account/saved",
      icon: Heart,
      title: "Saved items",
      body: "Items you're watching, with today's price; we tell you when one drops or sells.",
    },
    {
      href: "/account/warranty",
      icon: ShieldCheck,
      title: "Warranty claims",
      body: "Devices you bought through your account, the warranty left, and claims.",
    },
    {
      href: "/account/settings",
      icon: UserCog,
      title: "Profile and settings",
      body: "Your name and phone, your shop's details, or deleting your account.",
    },
  ];
  return (
    <section aria-labelledby="account-links" className="mt-10">
      <h2 id="account-links" className="text-xl font-bold">
        Your account
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map(({ href, icon: Icon, title, body }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-5 transition hover:border-brand-600/40 hover:shadow-sm"
            >
              <Icon className="size-5 text-brand-600" aria-hidden="true" />
              <span className="font-semibold text-ink">{title}</span>
              <span className="text-sm text-muted">{body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Buyers: what they can do from their account today. */
function Buyer() {
  const cards: { href: string; icon: LucideIcon; title: string; body: string }[] = [
    {
      href: "/shop",
      icon: ShoppingBag,
      title: "Browse the shop",
      body: "Tested, graded and data-wiped electronics from the Jammu hub.",
    },
    {
      href: "/warranty",
      icon: ShieldCheck,
      title: "Warranty and delivery",
      body: "What grades A and B cover, and how pickup and delivery work.",
    },
    {
      href: "/how-it-works",
      icon: PackageSearch,
      title: "How ReLoop works",
      body: "From the shop counter to the hub and on to the next owner.",
    },
  ];
  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-3">
      {cards.map(({ href, icon: Icon, title, body }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-5 transition hover:border-brand-600/40 hover:shadow-sm"
          >
            <Icon className="size-5 text-brand-600" aria-hidden="true" />
            <span className="font-semibold text-ink">{title}</span>
            <span className="text-sm text-muted">{body}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
