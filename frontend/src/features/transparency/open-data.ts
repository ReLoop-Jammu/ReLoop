import { LEDGER_COLUMNS, MONTH_COLUMNS } from "./model";

/** The open-data files: what each holds, and its columns (the data dictionary). */
export const OPEN_DATA = [
  {
    file: "ledger.csv",
    title: "List of scrap sent for recycling",
    about: "Every handover to VRRG Group, by category, in kg.",
    columns: LEDGER_COLUMNS,
  },
  {
    file: "monthly.csv",
    title: "Monthly figures",
    about: "One row per month of the pilot.",
    columns: MONTH_COLUMNS,
  },
  {
    file: "impact-flows.csv",
    title: "Impact flows",
    about: "Source group to outcome, by month: items and kg, from weighed records.",
    columns: [
      ["month", "First day of the month"],
      [
        "source_group",
        "Repair shops, retailers, institutions, stripped devices or the used parts shop",
      ],
      ["outcome", "Where it went: resold, stripped for parts, at the hub or handed to VRRG Group"],
      ["kind", "scrap, device or part"],
      ["category", "Scrap bin, device category or part type"],
      ["items", "Items (for scrap: weigh-ins)"],
      ["kg", "Kilograms, measured only"],
    ],
  },
  {
    file: "network-flows.csv",
    title: "Network flows",
    about:
      "Market to hub, hub to buyer area (3 or more items) and hub to VRRG Group, all time. Markets with fewer than 3 shops are merged.",
    columns: [
      ["from_node", "Where it came from"],
      ["to_node", "Where it went"],
      ["kind", "scrap, device, part or handover"],
      ["category", "Bin, category or part type"],
      ["items", "Items (for scrap: weigh-ins)"],
      ["kg", "Kilograms, measured only"],
    ],
  },
] as const;

export type OpenDataFile = (typeof OPEN_DATA)[number]["file"];
