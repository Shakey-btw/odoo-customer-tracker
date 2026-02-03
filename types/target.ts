export type TrackingTarget = "all" | "dach" | "uk";

export interface CountryFilter {
  name: string;
  slug: string;
  id: number;
  pages: number;
}

export interface TargetConfig {
  target: TrackingTarget;
  displayName: string;
  countries: CountryFilter[];
  totalPages: number;
  sheetTab: string;
}
