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
