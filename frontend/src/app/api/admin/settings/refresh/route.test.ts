// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

let admin: boolean;

beforeEach(() => {
  vi.resetModules();
  revalidateTag.mockClear();
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  admin = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "user-1" });
      if (url.endsWith("/rpc/is_admin")) return Response.json(admin);
      return new Response("", { status: 404 });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const refresh = async (token?: string) => {
  const { POST } = await import("./route");
  return POST(
    new Request("https://site.test/api/admin/settings/refresh", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
  );
};

describe("settings cache refresh", () => {
  it("lets an admin drop the cached settings", async () => {
    const res = await refresh("admin-token");
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("settings", { expire: 0 });
  });

  it("refuses visitors and non-admins", async () => {
    expect((await refresh()).status).toBe(401);
    admin = false;
    expect((await refresh("staff-token")).status).toBe(403);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
