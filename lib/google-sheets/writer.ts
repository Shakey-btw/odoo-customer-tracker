import { Customer } from "@/types/customer";
import { TrackingTarget } from "@/types/target";
import { getSheetsClient } from "./auth";
import { GOOGLE_SHEETS } from "@/lib/config/constants";
import { TARGET_CONFIGS as TARGETS } from "@/lib/config/targets";

/**
 * Append customers to the appropriate Google Sheets tab
 */
export async function appendCustomersToSheet(
  target: TrackingTarget,
  customers: Customer[]
): Promise<void> {
  if (customers.length === 0) {
    console.log(`No customers to append for target: ${target}`);
    return;
  }

  try {
    const sheets = await getSheetsClient();
    const sheetName = TARGETS[target].sheetTab;

    // Transform customers to row format
    const rows = customers.map(customer => [
      customer.detectedDate,
      customer.name,
      customer.industry,
      customer.country,
      customer.description,
      customer.detailUrl
    ]);

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID,
      range: `${sheetName}!A:F`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows
      }
    });

    console.log(`✓ Appended ${customers.length} customers to ${sheetName} tab`);
  } catch (error) {
    console.error(`Error appending customers to sheet (${target}):`, error);
    throw error;
  }
}

/**
 * Append a single customer to the sheet
 */
export async function appendCustomerToSheet(
  target: TrackingTarget,
  customer: Customer
): Promise<void> {
  await appendCustomersToSheet(target, [customer]);
}

/**
 * Batch append customers to multiple targets
 * Useful when a customer belongs to multiple tracking targets
 */
export async function appendCustomersToMultipleSheets(
  targets: TrackingTarget[],
  customers: Customer[]
): Promise<void> {
  const promises = targets.map(target =>
    appendCustomersToSheet(target, customers)
  );

  await Promise.all(promises);
}

/**
 * Append a log entry to the Scraping Log sheet
 */
export async function appendLogToSheet(
  target: TrackingTarget,
  customersFound: number,
  newCustomers: number,
  status: "Success" | "Error" = "Success"
): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    const logSheetName = GOOGLE_SHEETS.LOG_SHEET.NAME;

    // Format timestamp in CEST
    const timestamp = formatTimestampCEST(Date.now());

    // Create log row
    const row = [
      timestamp,
      target.toUpperCase(),
      customersFound,
      newCustomers,
      status
    ];

    // Append to log sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID,
      range: `${logSheetName}!A:E`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row]
      }
    });

    console.log(`✓ Logged scraping run to ${logSheetName}: ${target} (${newCustomers} new)`);
  } catch (error) {
    console.error(`Error appending log to sheet:`, error);
    // Don't throw - logging shouldn't break the scraping
  }
}

/**
 * Format timestamp in CEST timezone
 */
function formatTimestampCEST(timestamp: number): string {
  const date = new Date(timestamp);

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Paris', // CEST timezone
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };

  const formatted = new Intl.DateTimeFormat('de-DE', options).format(date);
  return `${formatted} CEST`;
}
