import { describe, expect, it } from "vitest";
import {
  allPass,
  checklistOf,
  inspectionFromRow,
  inspectionProblem,
  inspectionToRow,
  measuresFor,
} from "./inspection";

describe("ReLoop Checked inspections", () => {
  it("grade A at intake is every check passing", () => {
    expect(allPass("monitor")).toEqual({
      version: 1,
      checks: { "Powers on": "pass", Display: "pass", "No dead pixels": "pass", Inputs: "pass" },
    });
  });

  it("needs a result for every check and health readings from 0 to 100", () => {
    const i = allPass("ups");
    expect(inspectionProblem("ups", i)).toBeNull();
    expect(inspectionProblem("ups", { ...i, checks: { "Powers on": "pass" } })).toMatch(
      /Battery holds charge/,
    );
    expect(inspectionProblem("ups", { ...i, batteryHealthPct: 120 })).toMatch(/0 to 100/);
  });

  it("measures battery and storage only where they exist", () => {
    expect(measuresFor("laptop")).toEqual({ battery: true, storage: true });
    expect(measuresFor("monitor")).toEqual({ battery: false, storage: false });
    expect(measuresFor("part", "storage")).toEqual({ battery: false, storage: true });
  });

  it("round-trips the database shape and keeps the old checklist in step", () => {
    const i = {
      version: 1 as const,
      checks: { Display: "pass" as const, Touch: "fail" as const, Cameras: "na" as const },
      batteryHealthPct: 81,
    };
    const row = inspectionToRow(i);
    expect(row).toEqual({ version: 1, checks: i.checks, battery_health_pct: 81 });
    expect(inspectionFromRow(row)).toEqual(i);
    expect(checklistOf(i)).toEqual({ Display: true, Touch: false });
    expect(inspectionFromRow({ checks: {} })).toBeUndefined();
    expect(inspectionFromRow(null)).toBeUndefined();
  });
});
