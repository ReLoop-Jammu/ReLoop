import { describe, expect, it } from "vitest";
import { parseAuthRedirect } from "./auth-client";

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
