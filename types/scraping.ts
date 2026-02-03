import { TrackingTarget } from "./target";

export interface ScrapingJob {
  target: TrackingTarget;
  country?: string;
  countryId?: number;
  page: number;
  timestamp: number;
  retryCount?: number;
}

export interface ScrapingResult {
  success: boolean;
  page: number;
  customersFound: number;
  newCustomers: number;
  errors?: string[];
}

export interface ScrapingProgress {
  target: TrackingTarget;
  totalPages: number;
  scrapedPages: number;
  newCustomers: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  startTime: number;
  endTime?: number;
}
