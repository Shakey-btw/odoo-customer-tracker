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
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Orchestrator] Starting customer check...");

    const qstash = getQStashClient();

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
      const config = TARGET_CONFIGS[target];
      const isFullScan = await shouldDoFullScan(target);

      console.log(`[Orchestrator] ${target}: ${isFullScan ? "Full scan" : "Incremental scan"}`);

      // Get pages to check
      const pagesToCheck = isFullScan
        ? getAllPages(config.totalPages)
        : getIncrementalPages(target);

      console.log(`[Orchestrator] ${target}: Queuing ${pagesToCheck.length} pages`);

      // Queue jobs for this target
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

      // Update timestamps
      await updateLastCheckTimestamp(target);

      if (isFullScan) {
        await updateLastFullScanTimestamp(target);
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

    console.error(`[Orchestrator] Error after ${duration}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
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
export const maxDuration = 10; // Orchestrator should be fast
