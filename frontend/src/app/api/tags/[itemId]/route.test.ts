// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
let rows: unknown[];
let seenAuth: string | null;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pub-key");
  rows = [];
  seenAuth = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      if (String(input).includes("/rest/v1/items?")) {
        seenAuth = new Headers(init.headers).get("authorization");
        return Response.json(rows);
      }
      return new Response("", { status: 404 });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const get = async (id: string, token?: string) => {
  const { GET } = await import("./route");
  return GET(
    new Request(`https://site.test/api/tags/${id}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
    { params: Promise.resolve({ itemId: id }) },
  );
};

describe("item tag route", () => {
  it("prints the tag for staff, asking the database as the caller", async () => {
    rows = [{ id: "RL-JMU-0042", category: "laptop", part_type: null }];
    const res = await get("RL-JMU-0042", "staff-token");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(seenAuth).toBe("Bearer staff-token");
  });

  it("refuses visitors, items the caller can't read and odd tags", async () => {
    expect((await get("RL-JMU-0042")).status).toBe(401);
    expect((await get("RL-JMU-0042", "buyer-token")).status).toBe(404);
    expect((await get("nope", "staff-token")).status).toBe(404);
  });
});
