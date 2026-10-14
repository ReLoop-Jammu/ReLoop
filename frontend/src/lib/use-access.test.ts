import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Access } from "@/lib/auth-client";

const state = { version: 0, signedIn: true };
const myAccess = vi.fn<() => Promise<Access | null>>();
vi.mock("@/lib/auth-client", () => ({
  AUTH_EVENT: "reloop:auth",
  authVersion: () => state.version,
  getSession: () =>
    state.signedIn ? { access_token: "t", refresh_token: "r", user: { id: "u1" } } : null,
  myAccess: () => myAccess(),
}));

const access = (over: Partial<Access>): Access => ({
  user_id: "u1",
  name: "Asha",
  role: "admin",
  must_change_password: false,
  is_staff: false,
  is_admin: false,
  shop_status: null,
  ...over,
});
const changed = () =>
  act(() => {
    state.version++;
    window.dispatchEvent(new Event("reloop:auth"));
  });

beforeEach(() => {
  vi.resetModules();
  myAccess.mockReset();
  state.version = 0;
  state.signedIn = true;
});

describe("useAccess", () => {
  it("looks access up again after a forced password change ends", async () => {
    const { useAccess, roleLabel } = await import("./use-access");
    myAccess.mockResolvedValueOnce(access({ must_change_password: true }));
    const { result } = renderHook(() => useAccess());
    await waitFor(() => expect(result.current.state).toBe("ready"));
    const first = result.current.state === "ready" ? result.current.access : null;
    expect(roleLabel(first)).toBe("Password change needed");

    myAccess.mockResolvedValueOnce(access({ is_staff: true, is_admin: true }));
    changed();
    await waitFor(() =>
      expect(result.current).toEqual({
        state: "ready",
        access: expect.objectContaining({ is_admin: true }),
      }),
    );
    expect(myAccess).toHaveBeenCalledTimes(2);
  });

  it("doesn't keep a failed lookup, and shows signed-out without a session", async () => {
    const { useAccess } = await import("./use-access");
    myAccess.mockRejectedValueOnce(new Error("offline"));
    const first = renderHook(() => useAccess());
    await waitFor(() => expect(first.result.current).toEqual({ state: "ready", access: null }));
    first.unmount();
    myAccess.mockResolvedValueOnce(access({ is_staff: true }));
    const second = renderHook(() => useAccess());
    await waitFor(() =>
      expect(second.result.current).toEqual({
        state: "ready",
        access: expect.objectContaining({ is_staff: true }),
      }),
    );
    state.signedIn = false;
    changed();
    expect(second.result.current).toEqual({ state: "signed-out" });
  });
});
