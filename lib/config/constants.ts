export const SCRAPING_CONFIG = {
  // Daily incremental checks
  INCREMENTAL_PAGES: {
    all: 5,
    dach: 10, // per country
    uk: 36 // all pages
  },

  // Full scan interval (days)
  FULL_SCAN_INTERVAL: 7,

  // Request delays (seconds)
  BASE_DELAY: 60,
  DELAY_JITTER: 0.2,

  // Timeouts (milliseconds)
  SCRAPING_TIMEOUT: 50000,
  ORCHESTRATOR_TIMEOUT: 5000,

  // Retries
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,

  // Rate limiting
  MAX_CONCURRENT_REQUESTS: 5
};

export const REDIS_KEYS = {
  SEEN_PREFIX: "seen:",
  LAST_CHECK_PREFIX: "last_check:",
  PROGRESS_PREFIX: "progress:",
  LAST_FULL_SCAN_PREFIX: "last_full_scan:"
};

export const GOOGLE_SHEETS = {
  SPREADSHEET_ID: "12ANpkqMGXtnT9jtx5xFRWT7Ycdm7Yh2jxNlzBE2Op-o",
  HEADERS: [
    "Detection Date",
    "Company Name",
    "Industry",
    "Country",
    "Description",
    "Detail URL"
  ],
  LOG_SHEET: {
    NAME: "Scraping Log",
    HEADERS: [
      "Timestamp (CEST)",
      "Target",
      "Customers Found",
      "New Customers",
      "Status",
      "Error Message"
    ]
  }
};
