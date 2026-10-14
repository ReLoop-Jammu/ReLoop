import { describe, expect, it } from "vitest";
import { allPages } from "./pages";

describe("loading every page", () => {
  it("keeps asking until a page comes back short", async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => i);
    const asked: string[] = [];
    const got = await allPages(async (h) => {
      asked.push(h.Range);
      const [from, to] = h.Range.split("-").map(Number);
      return rows.slice(from, to + 1);
    });
    expect(got).toHaveLength(2500);
    expect(asked).toEqual(["0-999", "1000-1999", "2000-2999"]);
  });

  it("asks once for a short list, and twice for exactly one full page", async () => {
    let calls = 0;
    await allPages(async () => {
      calls++;
      return [1, 2];
    });
    expect(calls).toBe(1);
    calls = 0;
    await allPages(async (h) => (calls++, h.Range === "0-1" ? [1, 2] : []), 2);
    expect(calls).toBe(2);
  });
});
