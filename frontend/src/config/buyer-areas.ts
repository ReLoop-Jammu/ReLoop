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
  "Channi Rama",
  "Rehari Colony",
  "Talab Tillo",
  "Janipur",
  "Bakshi Nagar",
  "Shastri Nagar",
  "Nanak Nagar",
  "Gangyal",
  "Sainik Colony",
  "Digiana",
  "Sarwal",
  "Greater Kailash",
  "Residency Road",
  "Raghunath Bazaar",
  "Canal Road",
  "Parade",
  "Gole Market",
  "Jewel Chowk",
  "Satwari",
  "Bathindi",
  "Roop Nagar",
  "Muthi",
  "Paloura",
  "Sunjwan",
  "Domana",
  "Narwal",
  "Bhagwati Nagar",
  "Old Jammu city",
  "Other Jammu city area",
];
