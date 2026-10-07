/**
 * Every number the website uses from the ReLoop Business Plan (Jammu pilot,
 * Nov 2026 – Apr 2027), in one place. Change a rule here and every page,
 * estimate and hub automation follows. See docs/business-rules.md.
 *
 * Money is integer paise (₹1 = 100 paise). Shares are fractions (0.45 = 45%).
 */
export const BUSINESS_RULES = {
  hubCode: "JMU",

  /** What ReLoop pays, by grade (plan §04 "Money"). */
  buy: {
    /** A: about 45% of what we expect to resell it for. */
    A: { shareOfResale: 0.45 },
    /** B: about 25% of expected resale (we pay for the repair). */
    B: { shareOfResale: 0.25 },
    /** C: flat ₹100–200 for a parts unit. */
    C: { minPaise: 10_000, maxPaise: 20_000 },
    /** D: free pickup / safe disposal; we pay nothing. */
    D: { paise: 0 },
  },

  /** Items worth more than ₹10,000 can be sold on consignment; seller gets 70% on sale. */
  consignment: { thresholdPaise: 1_000_000, sellerShare: 0.7 },

  /** Commission when sellers list items themselves (not yet offered on the site). */
  selfListingCommission: 0.08,

  /** Delivery inside Jammu. Hub pickup is free. */
  jammuDeliveryPaise: 5_000,

  /** Warranty on devices bought from ReLoop. See docs/business-rules.md for scope. */
  warrantyDays: 30,
  warrantyGrades: ["A", "B"] as const,

  /** Hub service levels. */
  gradeWithinHours: 24,
  listWithinHours: 48,

  /** Unsold-stock rules, counted from the day an item is listed. */
  priceCut: { afterDays: 45, share: 0.2 },
  downgradeToC: { afterDays: 75 },

  /** Recycler handovers. */
  scrapHandover: { kgTrigger: 100, daysTrigger: 14 },
  batteryHandoverDays: 7,

  /** Pilot targets shown on the hub dashboard. */
  targets: {
    itemsPerMonth: 280,
    reuseShare: 0.65,
    avgStockAgeDays: 30,
    activePartnerShops: 25,
  },
  /** Planning assumption for the grade mix until real grading data replaces it. */
  plannedGradeMix: { A: 0.15, B: 0.25, C: 0.3, D: 0.3 },
} as const;
