import { NextRequest, NextResponse } from "next/server";
import { ScrapingJob, ScrapingResult } from "@/types/scraping";
import { scrapePageWithRetry } from "@/lib/scraper/cheerio-scraper";
import { buildUrl } from "@/lib/scraper/url-builder";
import { filterNewCustomers } from "@/lib/state/seen-tracker";
import { appendCustomersToSheet } from "@/lib/google-sheets/writer";
import { TARGET_CONFIGS } from "@/lib/config/targets";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse job from request body
    const job: ScrapingJob = await request.json();

    console.log(`[Worker] Processing job: ${job.target}, page ${job.page}`);

    // Build URL for this job
    const config = TARGET_CONFIGS[job.target];
    let url: string;

    if (job.target === "all") {
      url = buildUrl({ target: job.target, page: job.page });
    } else {
      // For DACH and UK, we need country info
      if (!job.country || job.countryId === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: "Country information required for non-all targets"
          },
          { status: 400 }
        );
      }

      const country = config.countries.find(c => c.id === job.countryId);
      if (!country) {
        return NextResponse.json(
          {
            success: false,
            error: `Country not found: ${job.country}`
          },
          { status: 400 }
        );
      }

      url = buildUrl({ target: job.target, page: job.page, country });
    }

    console.log(`[Worker] Scraping URL: ${url}`);

    // Scrape the page
    const customers = await scrapePageWithRetry({ url }, 3);

    console.log(`[Worker] Found ${customers.length} customers on page ${job.page}`);

    // Filter for new customers
    const newCustomers = await filterNewCustomers(customers, job.target);

    console.log(`[Worker] ${newCustomers.length} new customers detected`);

    // Append new customers to Google Sheets
    if (newCustomers.length > 0) {
      await appendCustomersToSheet(job.target, newCustomers);
    }

    const duration = Date.now() - startTime;

    const result: ScrapingResult = {
      success: true,
      page: job.page,
      customersFound: customers.length,
      newCustomers: newCustomers.length
    };

    console.log(
      `[Worker] Completed in ${duration}ms: ` +
      `${result.customersFound} found, ${result.newCustomers} new`
    );

    return NextResponse.json(result);

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[Worker] Error after ${duration}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 60; // Vercel Pro: 60 second timeout
export const dynamic = "force-dynamic";
