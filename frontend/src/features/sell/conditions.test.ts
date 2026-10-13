import { describe, expect, it } from "vitest";
import { SUBMISSION_CONDITIONS, storedCondition } from "./conditions";

// The check constraint on shop_submissions.condition in the live database.
const ALLOWED_IN_DATABASE = ["New", "Like New", "Good", "Used", "Damaged", "For Parts"];

describe("submission conditions", () => {
  it("stores every form condition as a value the database accepts", () => {
    for (const stored of Object.values(SUBMISSION_CONDITIONS)) {
      expect(ALLOWED_IN_DATABASE).toContain(stored);
    }
  });

  it("maps the form's wording", () => {
    expect(storedCondition("Working")).toBe("Good");
    expect(storedCondition("Broken")).toBe("Damaged");
    expect(storedCondition("Dead / scrap")).toBe("For Parts");
  });

  it("rejects anything the form doesn't offer", () => {
    expect(storedCondition("Mint")).toBeNull();
    expect(storedCondition("toString")).toBeNull();
  });
});
