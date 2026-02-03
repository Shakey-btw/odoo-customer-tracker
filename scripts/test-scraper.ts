/**
 * Test script to verify the scraper works against live Odoo pages
 * Run with: npx tsx scripts/test-scraper.ts
 */

import { scrapePage } from "../lib/scraper/cheerio-scraper";
import { buildUrl } from "../lib/scraper/url-builder";

async function testScraper() {
  console.log("🧪 Testing Odoo scraper...\n");

  // Test 1: Scrape first page of "All" customers
  console.log("Test 1: Scraping first page of 'All' customers");
  const allUrl = buildUrl({ target: "all", page: 1 });
  console.log(`URL: ${allUrl}`);

  try {
    const customers = await scrapePage({ url: allUrl });
    console.log(`✓ Found ${customers.length} customers`);

    if (customers.length > 0) {
      console.log("\nSample customer:");
      console.log(JSON.stringify(customers[0], null, 2));
    }
  } catch (error) {
    console.error("✗ Test 1 failed:", error);
  }

  console.log("\n---\n");

  // Test 2: Scrape first page of UK customers
  console.log("Test 2: Scraping first page of UK customers");
  const ukUrl = buildUrl({
    target: "uk",
    page: 1,
    country: {
      name: "United Kingdom",
      slug: "vereinigtes-konigreich",
      id: 222,
      pages: 36
    }
  });
  console.log(`URL: ${ukUrl}`);

  try {
    const customers = await scrapePage({ url: ukUrl });
    console.log(`✓ Found ${customers.length} customers`);

    if (customers.length > 0) {
      console.log("\nSample customer:");
      console.log(JSON.stringify(customers[0], null, 2));
    }
  } catch (error) {
    console.error("✗ Test 2 failed:", error);
  }

  console.log("\n---\n");

  // Test 3: Scrape first page of Germany (DACH)
  console.log("Test 3: Scraping first page of Germany customers");
  const deUrl = buildUrl({
    target: "dach",
    page: 1,
    country: {
      name: "Germany",
      slug: "deutschland",
      id: 56,
      pages: 115
    }
  });
  console.log(`URL: ${deUrl}`);

  try {
    const customers = await scrapePage({ url: deUrl });
    console.log(`✓ Found ${customers.length} customers`);

    if (customers.length > 0) {
      console.log("\nSample customer:");
      console.log(JSON.stringify(customers[0], null, 2));
    }
  } catch (error) {
    console.error("✗ Test 3 failed:", error);
  }

  console.log("\n✅ Testing complete");
}

testScraper().catch(console.error);
