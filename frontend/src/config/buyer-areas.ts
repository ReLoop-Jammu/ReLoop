/**
 * The localities staff pick from when an item is sold: Jammu Municipal
 * Corporation area plus "Collected at the hub". Mirrors the rows seeded into
 * `buyer_areas` (migration 20261107000001); a test keeps the two in step.
 * Staff review the list before launch.
 */
export const COLLECTED_AT_HUB = "Collected at the hub";

export const BUYER_AREAS: readonly string[] = [
  COLLECTED_AT_HUB,
  "Gandhi Nagar",
  "Trikuta Nagar",
  "Channi Himmat",
  "Talab Tillo",
  "Bakshi Nagar",
  "Rehari Colony",
  "Shastri Nagar",
  "Nanak Nagar",
  "Gangyal",
  "Sainik Colony",
  "Residency Road",
  "Old Jammu city",
  "Other Jammu city area",
];
