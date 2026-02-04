import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/state/redis";

export async function GET() {
  try {
    const redis = getRedisClient();

    // Fetch history from Redis (stored as a list)
    // Format: "history:all", "history:dach", "history:uk", "history:errors"
    const allHistory = await redis.lrange("history:all", 0, 49); // Last 50 entries
    const dachHistory = await redis.lrange("history:dach", 0, 49);
    const ukHistory = await redis.lrange("history:uk", 0, 49);
    const errorHistory = await redis.lrange("history:errors", 0, 49);

    // Parse and combine history
    const history = [
      ...allHistory.map(parseHistoryEntry),
      ...dachHistory.map(parseHistoryEntry),
      ...ukHistory.map(parseHistoryEntry),
      ...errorHistory.map(parseHistoryEntry)
    ]
      .filter(entry => entry !== null)
      .sort((a, b) => b.timestamp - a.timestamp) // Sort by most recent first
      .slice(0, 50); // Limit to 50 most recent entries

    return NextResponse.json({
      success: true,
      history
    });
  } catch (error) {
    console.error("Error fetching history:", error);

    // Return empty history on error (don't fail the UI)
    return NextResponse.json({
      success: false,
      history: [],
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function parseHistoryEntry(entry: string): any {
  try {
    return JSON.parse(entry);
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";
