import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { TARGET_CONFIGS } from "@/lib/config/targets";
import { shouldDoFullScan, updateLastCheckTimestamp, updateLastFullScanTimestamp } from "@/lib/state/seen-tracker";
import { ScrapingJob } from "@/types/scraping";
import { TrackingTarget } from "@/types/target";

// Initialize QStash client
function getQStashClient() {
  const token = process.env.QSTASH_TOKEN?.trim();

  if (!token) {
    throw new Error("QSTASH_TOKEN environment variable is required");
  }

  return new Client({ token });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("[Orchestrator] Request received at", new Date().toISOString());

    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Orchestrator] Unauthorized request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Orchestrator] Starting customer check...");
    console.log("[Orchestrator] Environment check:", {
      hasQStashToken: !!process.env.QSTASH_TOKEN,
      hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      vercelUrl: process.env.VERCEL_URL
    });

    const qstash = getQStashClient();
    console.log("[Orchestrator] QStash client initialized");

    // Construct worker URL with protocol
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const workerUrl = `${baseUrl}/api/scrape/worker`;

    console.log(`[Orchestrator] Worker URL: ${workerUrl}`);

    // Determine strategy for each target
    const targets: TrackingTarget[] = ["all", "dach", "uk"];
    let totalJobsQueued = 0;

    for (const target of targets) {
      const targetStartTime = Date.now();
      console.log(`[Orchestrator] Processing target: ${target}`);

      const config = TARGET_CONFIGS[target];
      const isFullScan = await shouldDoFullScan(target);

      console.log(`[Orchestrator] ${target}: ${isFullScan ? "Full scan" : "Incremental scan"}`);

      // Get pages to check
      const pagesToCheck = isFullScan
        ? getAllPages(config.totalPages)
        : getIncrementalPages(target);

      console.log(`[Orchestrator] ${target}: Queuing ${pagesToCheck.length} pages`);

      // Queue jobs for this target
      try {
        if (target === "all") {
          // Simple case: queue pages directly
          for (const page of pagesToCheck) {
            const job: ScrapingJob = {
              target,
              page,
              timestamp: Date.now()
            };

            await qstash.publishJSON({
              url: workerUrl,
              body: job,
              delay: calculateDelay(page)
            });

            totalJobsQueued++;
          }
        } else {
          // DACH or UK: queue per country
          for (const country of config.countries) {
            for (const page of pagesToCheck) {
              // Only queue if page exists for this country
              if (page <= country.pages) {
                const job: ScrapingJob = {
                  target,
                  country: country.name,
                  countryId: country.id,
                  page,
                  timestamp: Date.now()
                };

                await qstash.publishJSON({
                  url: workerUrl,
                  body: job,
                  delay: calculateDelay(page)
                });

                totalJobsQueued++;
              }
            }
          }
        }

        const targetDuration = Date.now() - targetStartTime;
        console.log(`[Orchestrator] ${target}: Queued ${pagesToCheck.length} jobs in ${targetDuration}ms`);

        // Update timestamps
        await updateLastCheckTimestamp(target);

        if (isFullScan) {
          await updateLastFullScanTimestamp(target);
        }

        console.log(`[Orchestrator] ${target}: Updated timestamps`);
      } catch (targetError) {
        console.error(`[Orchestrator] Error processing target ${target}:`, targetError);
        throw targetError;
      }
    }

    const duration = Date.now() - startTime;

    console.log(`[Orchestrator] Completed in ${duration}ms: ${totalJobsQueued} jobs queued`);

    return NextResponse.json({
      success: true,
      message: `Queued ${totalJobsQueued} scraping jobs`,
      jobsQueued: totalJobsQueued,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[Orchestrator] FATAL ERROR after ${duration}ms`);
    console.error(`[Orchestrator] Error type:`, error?.constructor?.name);
    console.error(`[Orchestrator] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[Orchestrator] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.error(`[Orchestrator] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));

    // Log error to Google Sheets and Redis for visibility
    try {
      const { appendLogToSheet } = await import("@/lib/google-sheets/writer");
      const { getRedisClient } = await import("@/lib/state/redis");

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log to Google Sheets for all targets
      await appendLogToSheet("all", 0, 0, "Error");

      // Log to Redis history
      const redis = getRedisClient();
      const historyEntry = JSON.stringify({
        target: "system",
        error: errorMessage,
        customersFound: 0,
        newCustomers: 0,
        timestamp: Date.now()
      });
      await redis.lpush("history:errors", historyEntry);
      await redis.ltrim("history:errors", 0, 99);

      console.log("[Orchestrator] Error logged to Google Sheets and Redis");
    } catch (logError) {
      console.error("[Orchestrator] Failed to log error:", logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name,
        duration,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function getAllPages(totalPages: number): number[] {
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

function getIncrementalPages(target: TrackingTarget): number[] {
  const incrementalPageCounts = {
    all: 5,
    dach: 10, // per country
    uk: 36 // all pages (it's small)
  };

  const pageCount = incrementalPageCounts[target];
  return Array.from({ length: pageCount }, (_, i) => i + 1);
}

function calculateDelay(page: number): number {
  // Spread requests over time to avoid rate limiting
  // Base delay: 60 seconds between pages
  const baseDelay = 60;

  // Add jitter (±20%)
  const jitter = Math.random() * 0.4 - 0.2; // -0.2 to +0.2
  const delay = Math.floor(page * baseDelay * (1 + jitter));

  return delay;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow time to queue all jobs via QStash
