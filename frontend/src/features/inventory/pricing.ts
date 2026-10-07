import { BUSINESS_RULES } from "@/config/business-rules";
import type { Grade } from "./model";

/** Answers from the household estimator. */
export type ConditionAnswers = {
  powersOn: "yes" | "no" | "unsure";
  allWorking: "yes" | "one_fault" | "several_faults" | "unsure";
  /** Swollen battery, water damage, cracked board or broken shell. */
  hazard: boolean;
};

/**
 * Likely grade from a seller's own answers. Indicative only: the real grade
 * is decided by testing at the hub.
 */
export function likelyGrade(a: ConditionAnswers): Grade {
  if (a.hazard) return "D";
  if (a.powersOn === "no") return "C";
  if (a.allWorking === "yes" && a.powersOn === "yes") return "A";
  if (a.allWorking === "one_fault") return "B";
  if (a.allWorking === "several_faults") return "C";
  return "B"; // unsure: assume one fault until tested
}

export type BuyEstimate =
  | {
      kind: "range";
      grade: Grade;
      minPaise: number;
      maxPaise: number;
      consignmentEligible: boolean;
      consignmentPaise?: number;
    }
  | { kind: "rule_only"; grade: Grade; consignmentEligible: false }
  | { kind: "free_disposal"; grade: "D" };

const roundTo = (paise: number, step = 5_000) => Math.round(paise / step) * step; // nearest ₹50

/**
 * What ReLoop would pay, following the plan's buy rules:
 * A ≈45% and B ≈25% of expected resale, C flat ₹100–200, D free pickup.
 * Without a resale value we can only state the rule, not a rupee figure.
 * The ±10% band reflects "about 45%" and testing variance.
 */
export function estimateBuyPrice(grade: Grade, expectedResalePaise: number | null): BuyEstimate {
  const rules = BUSINESS_RULES;
  if (grade === "D") return { kind: "free_disposal", grade };
  if (grade === "C") {
    return {
      kind: "range",
      grade,
      minPaise: rules.buy.C.minPaise,
      maxPaise: rules.buy.C.maxPaise,
      consignmentEligible: false,
    };
  }
  if (expectedResalePaise === null || expectedResalePaise <= 0) {
    return { kind: "rule_only", grade, consignmentEligible: false };
  }
  const centre = expectedResalePaise * rules.buy[grade].shareOfResale;
  const consignmentEligible = expectedResalePaise > rules.consignment.thresholdPaise;
  return {
    kind: "range",
    grade,
    minPaise: roundTo(centre * 0.9),
    maxPaise: roundTo(centre * 1.1),
    consignmentEligible,
    ...(consignmentEligible && {
      consignmentPaise: Math.round(expectedResalePaise * rules.consignment.sellerShare),
    }),
  };
}

/** Price after the day-45 cut (20% off), rounded to the nearest ₹10. */
export function cutPrice(paise: number): number {
  return Math.round((paise * (1 - BUSINESS_RULES.priceCut.share)) / 1_000) * 1_000;
}
