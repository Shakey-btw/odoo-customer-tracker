import { TrackingTarget, TargetConfig } from "@/types/target";

export const TARGET_CONFIGS: Record<TrackingTarget, TargetConfig> = {
  all: {
    target: "all",
    displayName: "All Customers",
    countries: [], // No filter
    totalPages: 4282,
    sheetTab: "All"
  },
  dach: {
    target: "dach",
    displayName: "DACH (Germany, Austria, Switzerland)",
    countries: [
      { name: "Germany", slug: "deutschland", id: 56, pages: 115 },
      { name: "Austria", slug: "osterreich", id: 13, pages: 40 },
      { name: "Switzerland", slug: "schweiz", id: 41, pages: 103 }
    ],
    totalPages: 258,
    sheetTab: "DACH"
  },
  uk: {
    target: "uk",
    displayName: "United Kingdom",
    countries: [
      { name: "United Kingdom", slug: "vereinigtes-konigreich", id: 222, pages: 36 }
    ],
    totalPages: 36,
    sheetTab: "UK"
  }
};
