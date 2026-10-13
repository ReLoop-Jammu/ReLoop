import { describe, expect, it } from "vitest";
import { createMemoryLimiter } from "./rate-limit-memory";

describe("memory rate limiter", () => {
  it("allows up to the limit then refuses", () => {
    const hit = createMemoryLimiter();
    const results = [1, 2, 3, 4].map(() => hit("ip", 3, 60, 1000));
    expect(results).toEqual([true, true, true, false]);
  });

  it("starts a fresh window after it expires", () => {
    const hit = createMemoryLimiter();
    for (let i = 0; i < 5; i++) hit("ip", 2, 60, 0);
    expect(hit("ip", 2, 60, 61_000)).toBe(true);
  });

  it("tracks keys separately and stays bounded", () => {
    const hit = createMemoryLimiter(3);
    expect(hit("a", 1, 60, 0)).toBe(true);
    expect(hit("b", 1, 60, 0)).toBe(true);
    expect(hit("a", 1, 60, 0)).toBe(false);
    for (let i = 0; i < 20; i++) hit(`k${i}`, 1, 60, 0);
    expect(hit("fresh", 1, 60, 0)).toBe(true);
  });
});
