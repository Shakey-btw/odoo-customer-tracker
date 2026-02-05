import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { ScrapingJob, ScrapingResult } from "@/types/scraping";
import { scrapePageWithRetry } from "@/lib/scraper/cheerio-scraper";
import { buildUrl } from "@/lib/scraper/url-builder";
import { filterNewCustomers } from "@/lib/state/seen-tracker";
import { appendCustomersToSheet, appendLogToSheet } from "@/lib/google-sheets/writer";
import { TARGET_CONFIGS } from "@/lib/config/targets";
import { getRedisClient } from "@/lib/state/redis";
import { TrackingTarget } from "@/types/target";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify QStash signature for security
    const signature = request.headers.get("upstash-signature");
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (signature && currentSigningKey && nextSigningKey) {
      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
      });

      const body = await request.text();
      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        console.error("[Worker] Invalid QStash signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }

      // Parse the verified body
      const job: ScrapingJob = JSON.parse(body);

      // Continue with processing...
      return await processJob(job, startTime);
    }

    // If no signature (direct call), parse normally
    const job: ScrapingJob = await request.json();
    return await processJob(job, startTime);
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[Worker] Error after ${duration}ms:`, error);

    // Try to get target from request body for error logging
    try {
      const body = await request.clone().json();
      if (body.target) {
        await appendLogToSheet(body.target, 0, 0, "Error");
      }
    } catch {
      // Ignore if we can't log the error
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

async function processJob(job: ScrapingJob, startTime: number): Promise<NextResponse> {
  try {

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

    // Log history to Redis
    await logHistory(job.target, customers.length, newCustomers.length);

    // Log to Google Sheets
    await appendLogToSheet(job.target, customers.length, newCustomers.length, "Success");

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

    console.error(`[Worker] Error in processJob after ${duration}ms:`, error);

    // Try to log error for this job's target
    try {
      if (job.target) {
        await appendLogToSheet(job.target, 0, 0, "Error");
      }
    } catch {
      // Ignore if we can't log the error
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

async function logHistory(
  target: TrackingTarget,
  customersFound: number,
  newCustomers: number
): Promise<void> {
  try {
    const redis = getRedisClient();
    const historyEntry = JSON.stringify({
      target,
      customersFound,
      newCustomers,
      timestamp: Date.now()
    });

    // Store in Redis list (keep last 100 entries per target)
    const key = `history:${target}`;
    await redis.lpush(key, historyEntry);
    await redis.ltrim(key, 0, 99); // Keep only last 100 entries
  } catch (error) {
    console.error("Failed to log history:", error);
    // Don't fail the worker if history logging fails
  }
}

export const maxDuration = 60; // Vercel Pro: 60 second timeout
export const dynamic = "force-dynamic";
