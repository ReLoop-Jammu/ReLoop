import { describe, expect, it } from "vitest";
import { loginDestination, loginHref, parseAuthRedirect, safeNext } from "./auth-client";

describe("reset links", () => {
  it("reads a recovery session from the link", () => {
    const r = parseAuthRedirect(
      "#access_token=a.b.c&expires_in=3600&refresh_token=r1&token_type=bearer&type=recovery",
    );
    expect(r.kind).toBe("recovery");
    if (r.kind === "recovery") {
      expect(r.session.access_token).toBe("a.b.c");
      expect(r.session.refresh_token).toBe("r1");
      expect(r.session.expires_at).toBeGreaterThan(Date.now() / 1000);
    }
  });

  it("explains expired or broken links", () => {
    expect(
      parseAuthRedirect("#error=access_denied&error_code=otp_expired&error_description=x"),
    ).toEqual({ kind: "error", message: expect.stringMatching(/expired/) });
    expect(parseAuthRedirect("#error=server_error&error_description=Something+broke")).toEqual({
      kind: "error",
      message: "Something broke",
    });
  });

  it("ignores links that aren't password recovery", () => {
    expect(parseAuthRedirect("")).toEqual({ kind: "none" });
    expect(parseAuthRedirect("#access_token=a&refresh_token=r&type=signup")).toEqual({
      kind: "none",
    });
  });
});

describe("safeNext", () => {
  const next = (v: string, fallback?: string) =>
    safeNext(`?next=${encodeURIComponent(v)}`, fallback);

  it("returns to any page on this site, keeping its query, including upper-case item tags", () => {
    expect(next("/hub/items/RL-JMU-0006")).toBe("/hub/items/RL-JMU-0006");
    expect(next("/shop?category=laptop&grade=A")).toBe("/shop?category=laptop&grade=A");
    expect(next("/sell/shops")).toBe("/sell/shops");
  });

  it("ignores other sites, protocol-relative and odd links, and the login pages", () => {
    for (const bad of [
      "https://evil.example/hub",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "hub",
      "/login",
      "/register?next=/hub",
      "/reset-password",
      "/shop\nx",
      "/.//evil.example",
      "/hub/..//evil.example",
      "/..//evil.example/x",
      "/%2e//evil.example",
      "/.%2e//evil.example",
      "/./\\evil.example",
    ])
      expect(next(bad), bad).toBe("/account");
  });

  it("uses the caller's fallback when there is no usable next page", () => {
    expect(safeNext("", "/hub")).toBe("/hub");
    expect(next("//x", "/")).toBe("/");
  });
});

describe("where login takes you", () => {
  const staff = { is_staff: true, is_admin: false };
  const buyer = { is_staff: false, is_admin: false };

  it("returns to the page that asked you to log in, for everyone", () => {
    expect(loginDestination("?next=%2Fhub%2Fitems%2FRL-JMU-0042", buyer)).toBe(
      "/hub/items/RL-JMU-0042",
    );
    expect(loginDestination("?next=%2Faccount%2Fchange-password", staff)).toBe(
      "/account/change-password",
    );
  });

  it("takes hub staff and admins to the hub, and others back where they were", () => {
    expect(loginDestination("?from=%2Fshop", staff)).toBe("/hub");
    expect(loginDestination("?from=%2Fshop%3Fq%3Ddell", buyer)).toBe("/shop?q=dell");
    expect(loginDestination("", buyer)).toBe("/account");
    expect(loginDestination("", null)).toBe("/account");
  });

  it("ignores unsafe places", () => {
    expect(loginDestination("?next=https%3A%2F%2Fevil.example", buyer)).toBe("/account");
    expect(loginDestination("?from=%2F%2Fevil.example", buyer)).toBe("/account");
    expect(loginDestination("?next=%2F%2Fevil.example", staff)).toBe("/hub");
  });

  it("builds a login link that comes back to the page", () => {
    expect(loginHref("/shop/RL-JMU-0042")).toBe("/login?from=%2Fshop%2FRL-JMU-0042");
    expect(loginHref("/shop", "?q=dell")).toBe("/login?from=%2Fshop%3Fq%3Ddell");
    expect(loginHref("/")).toBe("/login");
    expect(loginHref("/login")).toBe("/login");
  });
});
