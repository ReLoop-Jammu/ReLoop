// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let inserted: Record<string, unknown> | null;
let validToken: boolean | "down";
const TOKEN = "a".repeat(64);

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  inserted = null;
  validToken = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/user"))
        return validToken === "down"
          ? new Response("", { status: 503 })
          : validToken
            ? Response.json({ id: "buyer-1" })
            : new Response("", { status: 401 });
      if (url.includes("/rest/v1/items?")) return Response.json([{ status: "listed" }]);
      if (url.includes("/rest/v1/submissions") && init.method === "POST") {
        inserted = JSON.parse(String(init.body));
        return Response.json([{ status_token: TOKEN }]);
      }
      return new Response("", { status: 404 });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const send = async (headers: Record<string, string> = {}) => {
  const { POST } = await import("./route");
  return POST(
    new Request("https://site.test/api/requests", {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "reservation",
        itemId: "RL-JMU-0042",
        fields: { name: "Asha", phone: "9000000001" },
      }),
    }),
  );
};

describe("public requests", () => {
  it("saves a visitor's request without an account and returns its status link", async () => {
    const res = await send();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, statusToken: TOKEN, linked: false });
    expect(inserted).toMatchObject({ kind: "reservation", item_id: "RL-JMU-0042", buyer_id: null });
  });

  it("links a signed-in buyer's request to their account", async () => {
    const res = await send({ authorization: "Bearer good" });
    expect(await res.json()).toMatchObject({ linked: true });
    expect(inserted).toMatchObject({ buyer_id: "buyer-1" });
  });

  it("refuses an expired session instead of saving it as someone else's or anonymous", async () => {
    validToken = false;
    const res = await send({ authorization: "Bearer expired" });
    expect(res.status).toBe(401);
    expect(inserted).toBeNull();
  });

  it("still saves the request, unlinked, when the auth service is down", async () => {
    validToken = "down";
    const res = await send({ authorization: "Bearer good" });
    expect(await res.json()).toMatchObject({ ok: true, linked: false });
    expect(inserted).toMatchObject({ buyer_id: null });
  });

  it("never takes the buyer from the request body", async () => {
    const { POST } = await import("./route");
    await POST(
      new Request("https://site.test/api/requests", {
        method: "POST",
        body: JSON.stringify({
          kind: "institution_pickup",
          buyer_id: "someone-else",
          fields: { name: "GGM College", contact: "Asha", phone: "9000000001" },
        }),
      }),
    );
    expect(inserted).toMatchObject({ buyer_id: null });
  });
});
