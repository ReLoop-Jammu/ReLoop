"use client";

import { authenticatedFetch } from "@/lib/auth-client";

/** Calls a PostgREST path as the signed-in user; throws the database's message on failure. */
export async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await authenticatedFetch(`/rest/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await r.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!r.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : "That didn't work. Please try again.";
    throw new Error(message);
  }
  return data as T;
}

/** Calls a database function (an RPC), always with a JSON body. */
export const rpc = <T>(fn: string, args: Record<string, unknown> = {}) =>
  call<T>(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
