import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { filterAndSortListings } = await import("./queries");
const { SEED_LISTINGS } = await import("./seed-data");
const { parseListingFilters } = await import("./model");

describe("filterAndSortListings", () => {
  it("returns everything with no filters, in featured order", () => {
    expect(filterAndSortListings(SEED_LISTINGS, {})).toHaveLength(SEED_LISTINGS.length);
  });

  it("matches every search term, case-insensitively", () => {
    const result = filterAndSortListings(SEED_LISTINGS, { q: "LAPTOP ram" });
    expect(result.map((l) => l.slug)).toEqual(["ddr4-8gb-laptop-ram"]);
  });

  it("combines category and condition filters", () => {
    const result = filterAndSortListings(SEED_LISTINGS, {
      category: "components",
      condition: "tested",
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((l) => l.category === "components" && l.condition === "tested")).toBe(true);
  });

  it("sorts by price and keeps quote-only items last", () => {
    const asc = filterAndSortListings(SEED_LISTINGS, { sort: "price_asc" });
    const desc = filterAndSortListings(SEED_LISTINGS, { sort: "price_desc" });
    expect(asc.at(-1)?.pricePaise).toBeNull();
    expect(desc.at(-1)?.pricePaise).toBeNull();
    expect(asc[0].pricePaise).toBeLessThanOrEqual(asc[1].pricePaise ?? Infinity);
  });

  it("does not mutate the source list", () => {
    const before = SEED_LISTINGS.map((l) => l.id);
    filterAndSortListings(SEED_LISTINGS, { sort: "title" });
    expect(SEED_LISTINGS.map((l) => l.id)).toEqual(before);
  });
});

describe("parseListingFilters", () => {
  it("drops invalid values instead of throwing", () => {
    expect(
      parseListingFilters({ category: "spaceships", condition: "working", sort: "nope" }),
    ).toEqual({
      q: undefined,
      category: undefined,
      condition: "working",
      sort: undefined,
    });
  });

  it("trims the query and takes the first repeated param", () => {
    expect(parseListingFilters({ q: ["  ssd ", "x"] }).q).toBe("ssd");
    expect(parseListingFilters({ q: "   " }).q).toBeUndefined();
  });
});
