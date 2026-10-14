// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");
const map = readFileSync(join(__dirname, "LocationsMap.tsx"), "utf8");

describe("map colours", () => {
  it("are the --color-map-* design tokens", () => {
    for (const key of ["hub", "route", "recycler", "partner"]) {
      const token = css.match(new RegExp(`--color-map-${key}: (#[0-9a-f]{6});`))?.[1];
      expect(token, key).toBeTruthy();
      expect(map).toContain(`${key}: "${token}"`);
    }
  });
});
