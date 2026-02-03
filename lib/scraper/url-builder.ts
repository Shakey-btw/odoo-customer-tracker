import { TrackingTarget, CountryFilter } from "@/types/target";
import { TARGET_CONFIGS } from "@/lib/config/targets";

const BASE_URL = "https://www.odoo.com/de_DE/customers";

export interface UrlBuilderOptions {
  target: TrackingTarget;
  page: number;
  country?: CountryFilter;
}

export function buildUrl(options: UrlBuilderOptions): string {
  const { target, page, country } = options;

  // For "all" target - no country filter
  if (target === "all") {
    if (page === 1) {
      return BASE_URL;
    }
    return `${BASE_URL}/page/${page}`;
  }

  // For DACH and UK - use country filter
  if (!country) {
    throw new Error(`Country filter required for target: ${target}`);
  }

  const countryPath = `${BASE_URL}/country/${country.slug}-${country.id}`;

  if (page === 1) {
    return countryPath;
  }

  return `${countryPath}/page/${page}`;
}

export function getUrlsForTarget(target: TrackingTarget, pages: number[]): string[] {
  const config = TARGET_CONFIGS[target];

  // For "all" target
  if (target === "all") {
    return pages.map(page => buildUrl({ target, page }));
  }

  // For DACH and UK - build URLs for each country
  const urls: string[] = [];

  for (const country of config.countries) {
    for (const page of pages) {
      // Only include pages that exist for this country
      if (page <= country.pages) {
        urls.push(buildUrl({ target, page, country }));
      }
    }
  }

  return urls;
}

export function getPagesToCheck(target: TrackingTarget, isFullScan: boolean): number[] {
  const config = TARGET_CONFIGS[target];

  if (isFullScan) {
    // Return all pages for full scan
    return Array.from({ length: config.totalPages }, (_, i) => i + 1);
  }

  // Incremental scan - return first N pages based on target
  const incrementalPages = {
    all: 5,
    dach: 10, // per country
    uk: 36 // all pages (small enough)
  };

  const pageCount = incrementalPages[target];

  // For DACH, return first N pages per country
  if (target === "dach") {
    const pages: number[] = [];
    for (const country of config.countries) {
      const countryPageCount = Math.min(pageCount, country.pages);
      for (let i = 1; i <= countryPageCount; i++) {
        pages.push(i);
      }
    }
    // Return unique pages (will be combined with countries later)
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  }

  // For UK and All
  return Array.from({ length: Math.min(pageCount, config.totalPages) }, (_, i) => i + 1);
}
