// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Call = { url: string; method: string; body?: string };
let calls: Call[];
let flagged: boolean;
let signInStatus: number;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  calls = [];
  flagged = false;
  signInStatus = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = String(input);
      calls.push({ url, method: init.method ?? "GET", body: init.body as string | undefined });
      if (url.endsWith("/auth/v1/user"))
        return Response.json({ id: "u1", email: "asha@example.com" });
      if (url.includes("/rest/v1/profiles?select=must_change_password"))
        return Response.json([{ must_change_password: flagged }]);
      if (url.includes("grant_type=password"))
        return signInStatus === 200
          ? Response.json({ access_token: "throwaway" })
          : new Response("{}", { status: signInStatus });
      return new Response("", { status: 200 });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const post = async (body: object) => {
  const { POST } = await import("./route");
  return POST(
    new Request("https://site.test/api/account/password", {
      method: "POST",
      headers: { authorization: "Bearer user-token" },
      body: JSON.stringify(body),
    }),
  );
};
const passwordChanged = () => calls.some((c) => c.url.endsWith("/auth/v1/admin/users/u1"));

describe("/api/account/password", () => {
  it("needs the current password for an ordinary change", async () => {
    const res = await post({ password: "new-password-1" });
    expect(res.status).toBe(400);
    expect(passwordChanged()).toBe(false);
  });

  it("refuses a wrong current password", async () => {
    signInStatus = 400;
    const res = await post({ password: "new-password-1", currentPassword: "wrong" });
    expect(res.status).toBe(403);
    expect(passwordChanged()).toBe(false);
  });

  it("changes it with the right current password, and signs the check's session out", async () => {
    const res = await post({ password: "new-password-1", currentPassword: "old-password" });
    expect(res.status).toBe(200);
    expect(passwordChanged()).toBe(true);
    expect(calls.some((c) => c.url.includes("/auth/v1/logout"))).toBe(true);
  });

  it("doesn't call an auth outage a wrong password", async () => {
    signInStatus = 429;
    const res = await post({ password: "new-password-1", currentPassword: "old-password" });
    expect(res.status).toBe(502);
    expect(passwordChanged()).toBe(false);
  });

  it("after an admin reset, accepts the new password without the old one", async () => {
    flagged = true;
    const res = await post({ password: "new-password-1" });
    expect(res.status).toBe(200);
    expect(passwordChanged()).toBe(true);
    expect(calls.some((c) => c.url.includes("grant_type=password"))).toBe(false);
  });
});
