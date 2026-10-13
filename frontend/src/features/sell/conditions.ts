/**
 * The conditions a shop can pick on the submission form, and the value each is
 * stored as. shop_submissions.condition only allows New, Like New, Good, Used,
 * Damaged and For Parts (live schema, 2026-10-13), so the form's wording is
 * mapped here and also kept in the description.
 */
export const SUBMISSION_CONDITIONS = {
  Working: "Good",
  "Partially working": "Used",
  Broken: "Damaged",
  "Dead / scrap": "For Parts",
  Untested: "Used",
} as const;

export type SubmissionCondition = keyof typeof SUBMISSION_CONDITIONS;

/** The stored value for a form condition, or null if the form never offers it. */
export function storedCondition(formValue: string) {
  return Object.hasOwn(SUBMISSION_CONDITIONS, formValue)
    ? SUBMISSION_CONDITIONS[formValue as SubmissionCondition]
    : null;
}
