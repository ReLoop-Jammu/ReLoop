// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TARGET = "11111111-1111-4111-8111-111111111111";
let targetIsAdmin: "staff" | "admin_users" | null;
let calls: string[];

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  calls = [];
  targetIsAdmin = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = String(input);
      calls.push(`${init.method ?? "GET"} ${url}`);
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "admin-1" });
      if (url.endsWith("/rpc/is_admin")) return Response.json(true);
      if (url.includes("/rest/v1/staff?"))
        return Response.json(targetIsAdmin === "staff" ? [{ user_id: TARGET }] : []);
      if (url.includes("/rest/v1/admin_users?"))
        return Response.json(targetIsAdmin === "admin_users" ? [{ id: TARGET }] : []);
      if (url.includes("/rest/v1/profiles?")) return Response.json([{ user_id: TARGET }]);
      return new Response("", { status: 200 });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const reset = async () => {
  const { POST } = await import("./route");
  return POST(
    new Request(`https://site.test/api/admin/users/${TARGET}/reset-password`, {
      method: "POST",
      headers: { authorization: "Bearer admin-token" },
      body: JSON.stringify({ confirmedIdentity: true }),
    }),
    { params: Promise.resolve({ id: TARGET }) },
  );
};

describe("admin password reset", () => {
  it.each(["staff", "admin_users"] as const)(
    "won't reset another admin's password (%s admin)",
    async (kind) => {
      targetIsAdmin = kind;
      const res = await reset();
      expect(res.status).toBe(403);
      expect(calls.some((c) => c.startsWith("PATCH") || c.includes("/admin/users/"))).toBe(false);
    },
  );

  it("resets an ordinary account and returns the temporary password once", async () => {
    const res = await reset();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { password?: string };
    expect(body.password).toMatch(/.{12,}/);
    expect(calls.some((c) => c.startsWith("POST") && c.includes("admin_audit_log"))).toBe(true);
  });
});
