import { NextRequest, NextResponse } from "next/server";
import { initializeGoogleSheets, verifyGoogleSheetsAccess } from "@/lib/google-sheets/initializer";

export async function GET(request: NextRequest) {
  try {
    console.log("Starting Google Sheets initialization...");

    // First, verify access
    const accessCheck = await verifyGoogleSheetsAccess();

    if (!accessCheck.success) {
      return NextResponse.json(
        {
          error: "Failed to access Google Sheets",
          details: accessCheck.message
        },
        { status: 500 }
      );
    }

    console.log("✓ Google Sheets access verified");

    // Initialize sheets
    const result = await initializeGoogleSheets();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        details: result.details
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          details: result.details
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in init-sheets endpoint:", error);

    return NextResponse.json(
      {
        error: "Failed to initialize Google Sheets",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
