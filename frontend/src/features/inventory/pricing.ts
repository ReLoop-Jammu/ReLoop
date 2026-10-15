import { BUSINESS_RULES } from "@/config/business-rules";

/** Price after the day-30 cut on a part (25% off), rounded to the nearest ₹10 and never below ₹10. */
export function cutPrice(paise: number): number {
  return Math.max(
    1_000,
    Math.round((paise * (1 - BUSINESS_RULES.partPriceCut.share)) / 1_000) * 1_000,
  );
}
