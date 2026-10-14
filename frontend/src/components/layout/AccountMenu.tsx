"use client";

import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { CHANGE_PASSWORD_PATH, logoutAccount } from "@/lib/auth-client";
import { roleLabel, useAccess } from "@/lib/use-access";
import { cn } from "@/lib/utils/cn";
import { NotificationBell } from "@/features/account/NotificationBell";
import { LoginLink } from "./LoginLink";
import { useDisclosure } from "./use-disclosure";

async function signOut() {
  await logoutAccount();
  window.location.replace("/?signed-out=1");
}

/** Log in, or the signed-in user's menu: who they are, their role, and their tools. */
export function AccountMenu() {
  const a = useAccess();
  const { open, root, button, toggle } = useDisclosure();
  const panelId = useId();
  if (a.state === "signed-out") {
    return <LoginLink className={buttonClasses({ variant: "secondary", size: "sm" })} />;
  }
  const access = a.state === "ready" ? a.access : null;
  const staff = Boolean(access?.is_staff);
  const name = access?.name?.split(" ")[0] || "Account";
  return (
    <div className="flex items-center gap-2">
      {/* Its own menu, outside the account menu, so only one is open at a time. */}
      <NotificationBell />
      <div ref={root} className="relative flex items-center gap-2">
        {staff && (
          <Link
            href="/hub"
            className={buttonClasses({
              variant: "dark",
              size: "sm",
              className: "hidden lg:inline-flex",
            })}
          >
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Hub
          </Link>
        )}
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <User className="size-4" aria-hidden="true" />
          <span className="max-w-28 truncate">{name}</span>
          <span className="sr-only">: account menu</span>
          <ChevronDown
            className={cn("size-4 transition", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        <div
          id={panelId}
          hidden={!open}
          className="absolute top-full right-0 z-50 mt-2 w-64 rounded-card border border-line bg-surface p-2 shadow-lift"
        >
          <p className="px-3 py-2 text-sm">
            <span className="block font-semibold text-ink">{access?.name ?? "Signed in"}</span>
            <span className="text-muted">
              {a.state === "loading" ? "Checking your access…" : roleLabel(access)}
            </span>
          </p>
          <ul className="border-t border-line pt-1 text-sm">
            {staff && (
              <li>
                <Link
                  href="/hub"
                  className="block rounded-lg px-3 py-2.5 font-medium hover:bg-sunken"
                >
                  Staff hub
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/account"
                className="block rounded-lg px-3 py-2.5 font-medium hover:bg-sunken"
              >
                My account
              </Link>
            </li>
            <li>
              <Link
                href="/account/requests"
                className="block rounded-lg px-3 py-2.5 font-medium hover:bg-sunken"
              >
                My requests
              </Link>
            </li>
            <li>
              <Link
                href="/account/settings"
                className="block rounded-lg px-3 py-2.5 font-medium hover:bg-sunken"
              >
                Profile and settings
              </Link>
            </li>
            <li>
              <Link
                href={CHANGE_PASSWORD_PATH}
                className="block rounded-lg px-3 py-2.5 font-medium hover:bg-sunken"
              >
                Change password
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-medium hover:bg-sunken"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Log out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
