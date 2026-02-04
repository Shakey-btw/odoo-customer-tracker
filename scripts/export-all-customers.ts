/**
 * One-time export script to scrape ALL customers from UK and DACH
 * Saves to CSV files locally without touching Google Sheets or Redis
 *
 * Usage:
 *   npm run export:uk    - Export all UK customers
 *   npm run export:dach  - Export all DACH customers
 *   npm run export:all   - Export both UK and DACH
 */

import { scrapePageWithRetry } from "@/lib/scraper/cheerio-scraper";
import { buildUrl } from "@/lib/scraper/url-builder";
import { TARGET_CONFIGS } from "@/lib/config/targets";
import { Customer } from "@/types/customer";
import fs from "fs/promises";
import path from "path";

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), "exports");
const DELAY_BETWEEN_PAGES = 2000; // 2 seconds between pages to be respectful

interface ExportStats {
  target: string;
  country?: string;
  totalPages: number;
  totalCustomers: number;
  startTime: number;
  endTime?: number;
  errors: string[];
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert customers to CSV format
 */
function customersToCSV(customers: Customer[]): string {
  // CSV headers
  const headers = [
    "Detection Date",
    "Company Name",
    "Industry",
    "Country",
    "Description",
    "Detail URL"
  ];

  // CSV rows
  const rows = customers.map(customer => [
    customer.detectedDate,
    `"${customer.name.replace(/"/g, '""')}"`, // Escape quotes
    `"${customer.industry.replace(/"/g, '""')}"`,
    `"${customer.country.replace(/"/g, '""')}"`,
    `"${customer.description.replace(/"/g, '""')}"`,
    customer.detailUrl
  ]);

  // Combine headers and rows
  return [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");
}

/**
 * Export UK customers (all 36 pages)
 */
async function exportUK(): Promise<ExportStats> {
  const stats: ExportStats = {
    target: "UK",
    totalPages: 36,
    totalCustomers: 0,
    startTime: Date.now(),
    errors: []
  };

  console.log("\n=== Exporting UK Customers ===");
  console.log(`Total pages to scrape: ${stats.totalPages}`);
  console.log("This will take approximately 2-3 minutes...\n");

  const allCustomers: Customer[] = [];
  const config = TARGET_CONFIGS.uk;

  for (const country of config.countries) {
    console.log(`\n--- ${country.name} (${country.pages} pages) ---`);

    for (let page = 1; page <= country.pages; page++) {
      try {
        const url = buildUrl({ target: "uk", page, country });
        console.log(`[${page}/${country.pages}] Scraping: ${url}`);

        const customers = await scrapePageWithRetry({ url });
        allCustomers.push(...customers);

        console.log(`  ✓ Found ${customers.length} customers (Total: ${allCustomers.length})`);

        // Delay between pages
        if (page < country.pages) {
          await sleep(DELAY_BETWEEN_PAGES);
        }
      } catch (error) {
        const errorMsg = `Page ${page} failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  }

  stats.totalCustomers = allCustomers.length;
  stats.endTime = Date.now();

  // Save to CSV
  const csv = customersToCSV(allCustomers);
  const filename = `uk-customers-${new Date().toISOString().split('T')[0]}.csv`;
  const filepath = path.join(OUTPUT_DIR, filename);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(filepath, csv, "utf-8");

  console.log(`\n✅ Export complete!`);
  console.log(`   Total customers: ${stats.totalCustomers}`);
  console.log(`   Duration: ${Math.round((stats.endTime - stats.startTime) / 1000)}s`);
  console.log(`   Saved to: ${filepath}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(err => console.log(`   - ${err}`));
  }

  return stats;
}

/**
 * Export DACH customers (Germany: 115, Austria: 40, Switzerland: 103)
 */
async function exportDACH(): Promise<ExportStats> {
  const stats: ExportStats = {
    target: "DACH",
    totalPages: 258, // 115 + 40 + 103
    totalCustomers: 0,
    startTime: Date.now(),
    errors: []
  };

  console.log("\n=== Exporting DACH Customers ===");
  console.log(`Total pages to scrape: ${stats.totalPages}`);
  console.log("This will take approximately 10-12 minutes...\n");

  const allCustomers: Customer[] = [];
  const config = TARGET_CONFIGS.dach;

  for (const country of config.countries) {
    console.log(`\n--- ${country.name} (${country.pages} pages) ---`);

    for (let page = 1; page <= country.pages; page++) {
      try {
        const url = buildUrl({ target: "dach", page, country });
        console.log(`[${page}/${country.pages}] Scraping: ${url}`);

        const customers = await scrapePageWithRetry({ url });
        allCustomers.push(...customers);

        console.log(`  ✓ Found ${customers.length} customers (Total: ${allCustomers.length})`);

        // Delay between pages
        if (page < country.pages) {
          await sleep(DELAY_BETWEEN_PAGES);
        }
      } catch (error) {
        const errorMsg = `${country.name} page ${page} failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`  ✗ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  }

  stats.totalCustomers = allCustomers.length;
  stats.endTime = Date.now();

  // Save to CSV
  const csv = customersToCSV(allCustomers);
  const filename = `dach-customers-${new Date().toISOString().split('T')[0]}.csv`;
  const filepath = path.join(OUTPUT_DIR, filename);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(filepath, csv, "utf-8");

  console.log(`\n✅ Export complete!`);
  console.log(`   Total customers: ${stats.totalCustomers}`);
  console.log(`   Duration: ${Math.round((stats.endTime - stats.startTime) / 1000)}s`);
  console.log(`   Saved to: ${filepath}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(err => console.log(`   - ${err}`));
  }

  return stats;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase();

  console.log("========================================");
  console.log("   Odoo Customer Export Tool");
  console.log("========================================");

  try {
    if (target === "uk") {
      await exportUK();
    } else if (target === "dach") {
      await exportDACH();
    } else if (target === "all") {
      await exportUK();
      await exportDACH();
    } else {
      console.log("\nUsage:");
      console.log("  npm run export:uk    - Export all UK customers");
      console.log("  npm run export:dach  - Export all DACH customers");
      console.log("  npm run export:all   - Export both UK and DACH");
      process.exit(1);
    }

    console.log("\n========================================");
    console.log("   Export completed successfully!");
    console.log("========================================\n");
  } catch (error) {
    console.error("\n❌ Export failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
