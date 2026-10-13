"use client";

import type { AdminUserRow } from "@/app/api/admin/users/route";
import { siteFetch } from "@/lib/auth-client";

export type { AdminUserRow };

async function json<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "That didn't work. Try again.");
  return data;
}

/** Accounts matching an email, name or phone (admins only). */
export async function listUsers(q = ""): Promise<AdminUserRow[]> {
  return (
    await json<{ users: AdminUserRow[] }>(
      await siteFetch(`/api/admin/users?q=${encodeURIComponent(q)}`),
    )
  ).users;
}

/** Sets a temporary password, after the admin confirmed the person's identity. Returned once. */
export async function resetPassword(id: string): Promise<string> {
  return (
    await json<{ password: string }>(
      await siteFetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ confirmedIdentity: true }),
      }),
    )
  ).password;
}

/** Makes an account hub staff and/or an admin, or removes either (admins only; always one admin). */
export async function setAccountRole(id: string, staff: boolean, admin: boolean): Promise<void> {
  const { authenticatedFetch } = await import("@/lib/auth-client");
  const response = await authenticatedFetch("/rest/v1/rpc/set_account_role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_user: id, p_staff: staff, p_admin: admin }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "That change wasn't saved.");
  }
}
