import * as cheerio from "cheerio";
import { Customer } from "@/types/customer";

export interface ScraperOptions {
  url: string;
  timeout?: number;
}

export async function scrapePage(options: ScraperOptions): Promise<Customer[]> {
  const { url, timeout = 30000 } = options;

  try {
    // Fetch HTML with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OdooTrackerBot/1.0)"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const customers: Customer[] = [];

    // Parse customer cards based on Odoo's HTML structure
    // Each customer is in a card with a link to their detail page
    $("a[href*='/de_DE/customers/']").each((i, element) => {
      try {
        const $link = $(element);
        const detailUrl = $link.attr("href");

        // Skip if this is not a customer detail link (e.g., pagination)
        if (!detailUrl || !detailUrl.match(/\/de_DE\/customers\/[^\/]+-\d+$/)) {
          return;
        }

        // Find the customer card container
        const $card = $link.closest("div").parent();

        // Extract company name from the link
        const name = $link.find("h5, h4, h3").first().text().trim() ||
                     $link.text().trim();

        // Skip if no name found
        if (!name || name.length < 2) {
          return;
        }

        // Extract industry - usually a link with /industry/ in href
        let industry = "";
        $card.find("a[href*='/industry/']").each((j, el) => {
          const text = $(el).text().trim();
          if (text) {
            industry = text;
            return false; // break
          }
        });

        // Extract country - usually a link with /country/ in href
        let country = "";
        $card.find("a[href*='/country/']").each((j, el) => {
          const text = $(el).text().trim();
          if (text) {
            country = text;
            return false; // break
          }
        });

        // Extract description - usually a <p> tag
        let description = "";
        $card.find("p").each((j, el) => {
          const text = $(el).text().trim();
          // Skip short paragraphs (likely not descriptions)
          if (text && text.length > 20) {
            description = text;
            return false; // break
          }
        });

        // Only add customer if we have at least a valid name
        // Some customers don't have industry/country badges but are still valid
        if (name && name.length >= 2) {
          customers.push({
            name,
            industry: industry || "Unknown",
            country: country || "Unknown",
            description: description || "",
            detailUrl: detailUrl.startsWith("http")
              ? detailUrl
              : `https://www.odoo.com${detailUrl}`,
            detectedDate: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Error parsing customer card:", error);
        // Continue to next customer
      }
    });

    return customers;

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
    throw new Error("Unknown error during scraping");
  }
}

export async function scrapePageWithRetry(
  options: ScraperOptions,
  maxRetries: number = 3
): Promise<Customer[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await scrapePage(options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Scraping attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Scraping failed after retries");
}
