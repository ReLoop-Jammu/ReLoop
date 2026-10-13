import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { PASSWORD_ALPHABET, temporaryPassword } = await import("./supabase-admin");

describe("temporary passwords", () => {
  it("are 16 characters from an alphabet without look-alikes", () => {
    for (let i = 0; i < 200; i++) {
      const p = temporaryPassword();
      expect(p).toHaveLength(16);
      expect([...p].every((c) => PASSWORD_ALPHABET.includes(c))).toBe(true);
    }
    for (const c of "0O1lI") expect(PASSWORD_ALPHABET).not.toContain(c);
  });

  it("never repeat", () => {
    const seen = new Set(Array.from({ length: 1000 }, () => temporaryPassword()));
    expect(seen.size).toBe(1000);
  });
});
