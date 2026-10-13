"use client";

import { authenticatedFetch, getSession } from "@/lib/auth-client";

export type StaffRole = "admin" | "staff";

/**
 * Asks the database whether the signed-in user holds a role, through the
 * SECURITY DEFINER checks public.is_admin() and public.is_staff(). The
 * database enforces every permission on its own; this only decides what the
 * page shows.
 */
export async function hasRole(role: StaffRole): Promise<boolean> {
  const fn = role === "admin" ? "is_admin" : "is_staff";
  const response = await authenticatedFetch(`/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error("Could not check your access. Please log in again.");
  return (await response.json()) === true;
}

export type GateState = "checking" | "signed-out" | "denied" | "allowed" | "error";

/** What the role gate shows, given whether there is a session and what the role check said. */
export function gateState(input: {
  signedIn: boolean;
  allowed: boolean | null;
  failed: boolean;
}): GateState {
  if (!input.signedIn) return "signed-out";
  if (input.failed) return "error";
  if (input.allowed === null) return "checking";
  return input.allowed ? "allowed" : "denied";
}

export const isSignedIn = () => Boolean(getSession()?.access_token);
