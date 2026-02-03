/**
 * Detailed Test Script - Shows exactly what data gets pulled and how duplicate detection works
 * Run with: npx tsx scripts/detailed-test.ts
 *
 * This script simulates the entire flow WITHOUT requiring Redis, QStash, or Google Sheets.
 * Results are saved to: test-results.txt
 */

import * as fs from 'fs';
import { scrapePage } from '../lib/scraper/cheerio-scraper';
import { buildUrl } from '../lib/scraper/url-builder';
import { generateCustomerHash } from '../lib/state/hash';
import { Customer } from '../types/customer';
import { TARGET_CONFIGS } from '../lib/config/targets';

interface TestResult {
  scenario: string;
  url: string;
  customersFound: number;
  customers: Customer[];
}

// In-memory "seen" set to simulate Redis
const seenCustomers = new Set<string>();

async function main() {
  const output: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    output.push(msg);
  };

  log('='.repeat(80));
  log('ODOO CUSTOMER TRACKING BOT - DETAILED TEST');
  log('='.repeat(80));
  log('');
  log(`Test Date: ${new Date().toISOString()}`);
  log('');

  // ============================================================================
  // SCENARIO 1: Pull first 3 pages of DACH
  // ============================================================================
  log('');
  log('═'.repeat(80));
  log('SCENARIO 1: Pull first 3 pages of DACH');
  log('═'.repeat(80));
  log('');
  log('DACH includes: Germany, Austria, Switzerland');
  log('We will scrape 3 pages from each country');
  log('');

  const dachResults: TestResult[] = [];
  const dachConfig = TARGET_CONFIGS.dach;

  for (const country of dachConfig.countries) {
    log(`\n${'─'.repeat(80)}`);
    log(`Country: ${country.name} (${country.slug})`);
    log(`${'─'.repeat(80)}\n`);

    for (let page = 1; page <= 3; page++) {
      if (page > country.pages) {
        log(`  ⊗ Page ${page}: Skipped (country only has ${country.pages} pages)\n`);
        continue;
      }

      const url = buildUrl({ target: 'dach', page, country });
      log(`  → Scraping page ${page}: ${url}`);

      try {
        const customers = await scrapePage({ url, timeout: 30000 });

        dachResults.push({
          scenario: `DACH - ${country.name} - Page ${page}`,
          url,
          customersFound: customers.length,
          customers
        });

        log(`  ✓ Found ${customers.length} customers\n`);

        // Show first 2 customers as sample
        if (customers.length > 0) {
          log(`  Sample customers from this page:\n`);
          customers.slice(0, 2).forEach((customer, idx) => {
            const hash = generateCustomerHash(customer);
            log(`    ${idx + 1}. ${customer.name}`);
            log(`       Industry: ${customer.industry}`);
            log(`       Country: ${customer.country}`);
            log(`       URL: ${customer.detailUrl}`);
            log(`       Hash: ${hash}`);
            log('');
          });
        }

        // Delay to be polite to the server
        await delay(2000);

      } catch (error) {
        log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }
  }

  // Summary for DACH
  const dachTotal = dachResults.reduce((sum, r) => sum + r.customersFound, 0);
  log(`\n${'═'.repeat(80)}`);
  log(`DACH SUMMARY: ${dachTotal} total customers found across ${dachResults.length} pages`);
  log(`${'═'.repeat(80)}\n`);

  // ============================================================================
  // SCENARIO 2: Pull first 3 pages of UK
  // ============================================================================
  log('');
  log('═'.repeat(80));
  log('SCENARIO 2: Pull first 3 pages of UK');
  log('═'.repeat(80));
  log('');

  const ukResults: TestResult[] = [];
  const ukConfig = TARGET_CONFIGS.uk;
  const ukCountry = ukConfig.countries[0]; // UK only has one country

  log(`Country: ${ukCountry.name} (${ukCountry.slug})`);
  log('');

  for (let page = 1; page <= 3; page++) {
    const url = buildUrl({ target: 'uk', page, country: ukCountry });
    log(`  → Scraping page ${page}: ${url}`);

    try {
      const customers = await scrapePage({ url, timeout: 30000 });

      ukResults.push({
        scenario: `UK - Page ${page}`,
        url,
        customersFound: customers.length,
        customers
      });

      log(`  ✓ Found ${customers.length} customers\n`);

      // Show first 2 customers as sample
      if (customers.length > 0) {
        log(`  Sample customers from this page:\n`);
        customers.slice(0, 2).forEach((customer, idx) => {
          const hash = generateCustomerHash(customer);
          log(`    ${idx + 1}. ${customer.name}`);
          log(`       Industry: ${customer.industry}`);
          log(`       Country: ${customer.country}`);
          log(`       URL: ${customer.detailUrl}`);
          log(`       Hash: ${hash}`);
          log('');
        });
      }

      // Delay to be polite
      await delay(2000);

    } catch (error) {
      log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  // Summary for UK
  const ukTotal = ukResults.reduce((sum, r) => sum + r.customersFound, 0);
  log(`\n${'═'.repeat(80)}`);
  log(`UK SUMMARY: ${ukTotal} total customers found across ${ukResults.length} pages`);
  log(`${'═'.repeat(80)}\n`);

  // ============================================================================
  // SCENARIO 3: Pull first 1.5 pages of All (simulate duplicate detection)
  // ============================================================================
  log('');
  log('═'.repeat(80));
  log('SCENARIO 3: Pull first 1.5 pages of All + Simulate Duplicate Detection');
  log('═'.repeat(80));
  log('');
  log('This scenario demonstrates how the duplicate detection works:');
  log('1. First, we scrape 1.5 pages (page 1 + half of page 2)');
  log('2. Mark the LAST 2 customers as "already seen" (simulate existing in Redis)');
  log('3. Then scrape again and see which ones are detected as "new"');
  log('');

  const allResults: TestResult[] = [];
  let allCustomers: Customer[] = [];

  // Step 1: Scrape page 1
  log(`${'─'.repeat(80)}`);
  log('STEP 1: Initial scrape - Page 1 of All');
  log(`${'─'.repeat(80)}\n`);

  const page1Url = buildUrl({ target: 'all', page: 1 });
  log(`  → Scraping: ${page1Url}`);

  try {
    const customers = await scrapePage({ url: page1Url, timeout: 30000 });

    allResults.push({
      scenario: 'All - Page 1 (Initial)',
      url: page1Url,
      customersFound: customers.length,
      customers
    });

    allCustomers.push(...customers);
    log(`  ✓ Found ${customers.length} customers\n`);

  } catch (error) {
    log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  await delay(2000);

  // Step 2: Scrape page 2
  log(`\n${'─'.repeat(80)}`);
  log('STEP 2: Initial scrape - Page 2 of All');
  log(`${'─'.repeat(80)}\n`);

  const page2Url = buildUrl({ target: 'all', page: 2 });
  log(`  → Scraping: ${page2Url}`);

  try {
    const customers = await scrapePage({ url: page2Url, timeout: 30000 });

    allResults.push({
      scenario: 'All - Page 2 (Initial)',
      url: page2Url,
      customersFound: customers.length,
      customers
    });

    allCustomers.push(...customers);
    log(`  ✓ Found ${customers.length} customers\n`);

  } catch (error) {
    log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Step 3: Show all customers found
  log(`\n${'─'.repeat(80)}`);
  log(`STEP 3: All customers found (${allCustomers.length} total)`);
  log(`${'─'.repeat(80)}\n`);

  allCustomers.forEach((customer, idx) => {
    const hash = generateCustomerHash(customer);
    log(`${idx + 1}. ${customer.name}`);
    log(`   Industry: ${customer.industry}`);
    log(`   Country: ${customer.country}`);
    log(`   Hash: ${hash}`);
    log('');
  });

  // Step 4: Simulate "already seen" - mark last 2 as seen
  log(`\n${'─'.repeat(80)}`);
  log('STEP 4: Simulate "Already Seen" State');
  log(`${'─'.repeat(80)}\n`);
  log('Marking the LAST 2 customers as "already seen" (simulate they exist in Redis)');
  log('');

  const lastTwoCustomers = allCustomers.slice(-2);
  lastTwoCustomers.forEach((customer, idx) => {
    const hash = generateCustomerHash(customer);
    seenCustomers.add(hash);
    log(`  ✓ Marked as seen: ${customer.name}`);
    log(`    Hash: ${hash}`);
    log('');
  });

  log(`Redis simulation now contains ${seenCustomers.size} customer hashes\n`);

  // Step 5: Re-scrape and detect new vs old
  log(`\n${'─'.repeat(80)}`);
  log('STEP 5: Re-scrape and Detect New vs Already Seen');
  log(`${'─'.repeat(80)}\n`);
  log('Now we scrape the same pages again and check which customers are "new"');
  log('');

  const newCustomers: Customer[] = [];
  const oldCustomers: Customer[] = [];

  // Re-scrape page 1
  log(`  → Re-scraping page 1: ${page1Url}\n`);

  try {
    const customers = await scrapePage({ url: page1Url, timeout: 30000 });

    for (const customer of customers) {
      const hash = generateCustomerHash(customer);
      if (seenCustomers.has(hash)) {
        oldCustomers.push(customer);
      } else {
        newCustomers.push(customer);
        // In real system, we'd add to Redis here
        seenCustomers.add(hash);
      }
    }

    log(`  ✓ Page 1: ${customers.length} total → ${newCustomers.filter((c, i, arr) => i < customers.length).length} new, ${oldCustomers.filter((c, i, arr) => i < customers.length).length} already seen\n`);

  } catch (error) {
    log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  await delay(2000);

  // Re-scrape page 2
  const newFromPage2Start = newCustomers.length;
  const oldFromPage2Start = oldCustomers.length;

  log(`  → Re-scraping page 2: ${page2Url}\n`);

  try {
    const customers = await scrapePage({ url: page2Url, timeout: 30000 });

    for (const customer of customers) {
      const hash = generateCustomerHash(customer);
      if (seenCustomers.has(hash)) {
        oldCustomers.push(customer);
      } else {
        newCustomers.push(customer);
        seenCustomers.add(hash);
      }
    }

    const newFromPage2 = newCustomers.length - newFromPage2Start;
    const oldFromPage2 = oldCustomers.length - oldFromPage2Start;

    log(`  ✓ Page 2: ${customers.length} total → ${newFromPage2} new, ${oldFromPage2} already seen\n`);

  } catch (error) {
    log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Step 6: Show results
  log(`\n${'═'.repeat(80)}`);
  log('STEP 6: DUPLICATE DETECTION RESULTS');
  log(`${'═'.repeat(80)}\n`);

  log(`Total customers scraped: ${newCustomers.length + oldCustomers.length}`);
  log(`✓ NEW customers (would be added to Google Sheets): ${newCustomers.length}`);
  log(`⊗ ALREADY SEEN customers (skipped): ${oldCustomers.length}`);
  log('');

  log(`\n${'─'.repeat(80)}`);
  log('NEW Customers (these would be written to Google Sheets):');
  log(`${'─'.repeat(80)}\n`);

  if (newCustomers.length > 0) {
    newCustomers.forEach((customer, idx) => {
      log(`${idx + 1}. ${customer.name}`);
      log(`   Industry: ${customer.industry}`);
      log(`   Country: ${customer.country}`);
      log(`   URL: ${customer.detailUrl}`);
      log('');
    });
  } else {
    log('(None - all customers were already seen)\n');
  }

  log(`\n${'─'.repeat(80)}`);
  log('ALREADY SEEN Customers (these would be skipped):');
  log(`${'─'.repeat(80)}\n`);

  if (oldCustomers.length > 0) {
    oldCustomers.forEach((customer, idx) => {
      log(`${idx + 1}. ${customer.name}`);
      log(`   Industry: ${customer.industry}`);
      log(`   Country: ${customer.country}`);
      log(`   URL: ${customer.detailUrl}`);
      log('');
    });
  } else {
    log('(None)\n');
  }

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  log('');
  log('═'.repeat(80));
  log('FINAL SUMMARY');
  log('═'.repeat(80));
  log('');
  log(`DACH (3 pages per country):`);
  log(`  Total customers found: ${dachTotal}`);
  log(`  Pages scraped: ${dachResults.length}`);
  log('');
  log(`UK (3 pages):`);
  log(`  Total customers found: ${ukTotal}`);
  log(`  Pages scraped: ${ukResults.length}`);
  log('');
  log(`All (1.5 pages with duplicate detection):`);
  log(`  Total customers scraped: ${allCustomers.length}`);
  log(`  New customers detected: ${newCustomers.length}`);
  log(`  Already seen (skipped): ${oldCustomers.length}`);
  log('');
  log(`Redis simulation state:`);
  log(`  Total customer hashes stored: ${seenCustomers.size}`);
  log('');
  log('═'.repeat(80));
  log('');
  log('This demonstrates how the system would work in production:');
  log('');
  log('1. Scrape pages from Odoo');
  log('2. For each customer, generate a hash (name|country|industry)');
  log('3. Check if hash exists in Redis');
  log('4. If NEW → Add to Google Sheets + Store hash in Redis');
  log('5. If SEEN → Skip (already in Google Sheets)');
  log('');
  log('The Redis "seen" set prevents duplicates across all future runs.');
  log('');
  log('═'.repeat(80));
  log('');
  log(`Test completed at: ${new Date().toISOString()}`);
  log('');

  // Save to file
  const outputPath = 'test-results.txt';
  fs.writeFileSync(outputPath, output.join('\n'), 'utf-8');

  console.log('');
  console.log('═'.repeat(80));
  console.log(`✓ Results saved to: ${outputPath}`);
  console.log('═'.repeat(80));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
