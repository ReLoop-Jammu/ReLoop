/**
 * Every public rule the website uses from Business Plan v2 (Jammu pilot, Nov 2026 –
 * Apr 2027), in one place. Change a rule here and every page, estimate and hub
 * automation follows. See docs/business-rules.md.
 *
 * Only public rules live here. Per-device buy prices, VRRG rates, benchmarks and
 * every other money figure from the plan are staff-only settings (finance.*, vrg.*)
 * and never appear in this repo.
 *
 * Money is integer paise (₹1 = 100 paise). Shares are fractions (0.25 = 25%).
 */
export const BUSINESS_RULES = {
  hubCode: "JMU",

  /** Delivery inside Jammu city (the Jammu Municipal Corporation area). Hub pickup is free. */
  jammuDeliveryPaise: 5_000,

  /** Warranty on grade A and B devices; a 7-day return on parts. */
  warrantyDays: 30,
  warrantyGrades: ["A", "B"] as const,
  partReturnDays: 7,

  /** Hub service levels. */
  gradeWithinHours: 24,
  listWithinHours: 48,

  /** Unsold-stock rules, counted from the day an item is listed. */
  partPriceCut: { afterDays: 30, share: 0.25 },
  deviceToC: { afterDays: 45 },
  /** A part unsold this long raises a "consider scrap" alert. */
  partScrapAlertDays: 60,
  /** Items already past a threshold when the rules start get this many days' grace. */
  switchOverGraceDays: 7,

  /** Scrap bins: handed to the dismantling partner on a weight receipt. */
  bins: { handoverKg: 100, alertKg: 80, handoverDays: 14, batteryHandoverDays: 7 },

  /** The Parts Exchange commission, a published term shown to shops (never to buyers). */
  partCommissionShare: 0.12,
  /** The institution lot fee (published): pickup, sorting on site and a handover record. */
  institutionLotFeePaise: 300_000,

  /** Pilot targets shown on the hub dashboard and public counter: counts and kg only. */
  targets: {
    partnerShops: 40,
    kgPerMonth: 500,
    /** ReLoop's standard: every kilo of scrap goes to the dismantling partner on a weight receipt. */
    shareOfScrapToVrrg: 1,
    /** Staff-only, from a monthly shop self-report. */
    kgToUnregisteredDealers: 0,
  },
  /** Month-by-month ramp in the pilot plan (shops, kg a month, devices a month). */
  ramp: {
    shops: [10, 18, 26, 32, 36, 40],
    kg: [92, 222, 352, 436, 474, 506],
    devices: [15, 25, 35, 45, 55, 60],
  },
  /** Stage gates: months 1-2 move on at this kg in a month with at most this many missed weekly pickups. */
  stageGateOne: { kgInMonth: 200, maxMissedPickups: 4 },
  /** Planning assumption for the device grade mix until real grading data replaces it. */
  plannedGradeMix: { A: 0.15, B: 0.2, C: 0.45, D: 0.2 },
} as const;
