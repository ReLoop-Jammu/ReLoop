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
      if (String(input).endsWith("/rpc/payout_receipt")) {
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

const get = async (receipt: string, token?: string) => {
  const { GET } = await import("./route");
  return GET(
    new Request(`https://site.test/api/payouts/${receipt}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
    { params: Promise.resolve({ receipt }) },
  );
};

describe("receipt PDF route", () => {
  it("asks the database as the caller, and sends the PDF only when it answers", async () => {
    rows = [
      {
        receipt_no: "RL-PAY-2026-0001",
        paid_at: "2026-11-03",
        amount_paise: 60000,
        method: "cash",
        item_name: "TV",
        quantity: 1,
        shop_name: "Sharma Mobiles",
        purchased_at: null,
      },
    ];
    const res = await get("RL-PAY-2026-0001", "owner-token");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(seenAuth).toBe("Bearer owner-token");
  });

  it("refuses without a login, for someone else's receipt and for odd numbers", async () => {
    expect((await get("RL-PAY-2026-0001")).status).toBe(401);
    expect((await get("RL-PAY-2026-0001", "other-shop")).status).toBe(404);
    expect((await get("..%2Fsecrets", "x")).status).toBe(404);
  });
});
