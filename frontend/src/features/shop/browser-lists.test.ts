import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCompare,
  compareHref,
  rememberViewed,
  toggleCompare,
  useShopList,
} from "./browser-lists";

const it_ = (n: number) => ({
  id: `RL-JMU-000${n}`,
  title: `Item ${n}`,
  pricePaise: 100000 * n,
  grade: "A",
});

beforeEach(() => window.localStorage.clear());

describe("lists kept in this browser", () => {
  it("compares up to three items and builds a shareable link", () => {
    const { result } = renderHook(() => useShopList("compare"));
    act(() => {
      toggleCompare(it_(1));
      toggleCompare(it_(2));
      toggleCompare(it_(3));
    });
    let added = true;
    act(() => {
      added = toggleCompare(it_(4));
    });
    expect(added).toBe(false);
    expect(result.current.map((i) => i.id)).toEqual(["RL-JMU-0001", "RL-JMU-0002", "RL-JMU-0003"]);
    expect(compareHref(result.current)).toBe(
      "/shop/compare?ids=RL-JMU-0001,RL-JMU-0002,RL-JMU-0003",
    );
    act(() => toggleCompare(it_(2)));
    expect(result.current).toHaveLength(2);
    act(() => clearCompare());
    expect(result.current).toEqual([]);
  });

  it("remembers recently viewed items, newest first, without repeats, and ignores bad data", () => {
    const { result } = renderHook(() => useShopList("viewed"));
    act(() => {
      rememberViewed(it_(1));
      rememberViewed(it_(2));
      rememberViewed(it_(1));
    });
    expect(result.current.map((i) => i.id)).toEqual(["RL-JMU-0001", "RL-JMU-0002"]);
    window.localStorage.setItem("reloop-recently-viewed", "not json");
    act(() => window.dispatchEvent(new Event("storage")));
    expect(result.current).toEqual([]);
  });
});
