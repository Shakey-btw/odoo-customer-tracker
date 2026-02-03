import { getSheetsClient } from "./auth";
import { GOOGLE_SHEETS } from "@/lib/config/constants";
import { TARGET_CONFIGS } from "@/lib/config/targets";

/**
 * Initialize Google Sheets with tabs and headers
 * Creates tabs for All, DACH, and UK if they don't exist
 * Adds header row to each tab
 */
export async function initializeGoogleSheets(): Promise<{
  success: boolean;
  message: string;
  details: {
    tabsCreated: string[];
    tabsUpdated: string[];
    errors: string[];
  };
}> {
  const details = {
    tabsCreated: [] as string[],
    tabsUpdated: [] as string[],
    errors: [] as string[]
  };

  try {
    const sheets = await getSheetsClient();

    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID
    });

    const existingSheets = spreadsheet.data.sheets?.map(
      sheet => sheet.properties?.title || ""
    ) || [];

    // Process each target
    for (const [targetKey, targetConfig] of Object.entries(TARGET_CONFIGS)) {
      const sheetName = targetConfig.sheetTab;

      try {
        // Check if tab exists
        if (!existingSheets.includes(sheetName)) {
          // Create new tab
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: {
                    title: sheetName
                  }
                }
              }]
            }
          });

          details.tabsCreated.push(sheetName);
          console.log(`✓ Created tab: ${sheetName}`);
        } else {
          details.tabsUpdated.push(sheetName);
          console.log(`✓ Tab already exists: ${sheetName}`);
        }

        // Add or update headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID,
          range: `${sheetName}!A1:F1`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [GOOGLE_SHEETS.HEADERS]
          }
        });

        // Format header row (bold, freeze)
        const sheetId = spreadsheet.data.sheets?.find(
          s => s.properties?.title === sheetName
        )?.properties?.sheetId;

        if (sheetId !== undefined) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID,
            requestBody: {
              requests: [
                {
                  // Make header row bold
                  repeatCell: {
                    range: {
                      sheetId,
                      startRowIndex: 0,
                      endRowIndex: 1
                    },
                    cell: {
                      userEnteredFormat: {
                        textFormat: {
                          bold: true
                        }
                      }
                    },
                    fields: "userEnteredFormat.textFormat.bold"
                  }
                },
                {
                  // Freeze header row
                  updateSheetProperties: {
                    properties: {
                      sheetId,
                      gridProperties: {
                        frozenRowCount: 1
                      }
                    },
                    fields: "gridProperties.frozenRowCount"
                  }
                }
              ]
            }
          });
        }

        console.log(`✓ Updated headers for: ${sheetName}`);

      } catch (error) {
        const errorMsg = `Failed to process tab ${sheetName}: ${error}`;
        details.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Create Scraping Log tab
    const logSheetName = GOOGLE_SHEETS.LOG_SHEET.NAME;
    try {
      // Refresh spreadsheet data to get latest sheets (after creating target tabs)
      const updatedSpreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID
      });

      const updatedExistingSheets = updatedSpreadsheet.data.sheets?.map(
        sheet => sheet.properties?.title || ""
      ) || [];

      if (!updatedExistingSheets.includes(logSheetName)) {
        // Create log tab
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: logSheetName
                }
              }
            }]
          }
        });

        details.tabsCreated.push(logSheetName);
        console.log(`✓ Created tab: ${logSheetName}`);
      } else {
        details.tabsUpdated.push(logSheetName);
        console.log(`✓ Tab already exists: ${logSheetName}`);
      }

      // Add headers to log sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID,
        range: `${logSheetName}!A1:E1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [GOOGLE_SHEETS.LOG_SHEET.HEADERS]
        }
      });

      // Format log sheet header (bold, freeze)
      const finalSpreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID
      });

      const logSheetId = finalSpreadsheet.data.sheets?.find(
        s => s.properties?.title === logSheetName
      )?.properties?.sheetId;

      if (logSheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: logSheetId,
                    startRowIndex: 0,
                    endRowIndex: 1
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: {
                        bold: true
                      }
                    }
                  },
                  fields: "userEnteredFormat.textFormat.bold"
                }
              },
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: logSheetId,
                    gridProperties: {
                      frozenRowCount: 1
                    }
                  },
                  fields: "gridProperties.frozenRowCount"
                }
              }
            ]
          }
        });
      }

      console.log(`✓ Updated headers for: ${logSheetName}`);

    } catch (error) {
      const errorMsg = `Failed to process log tab ${logSheetName}: ${error}`;
      details.errors.push(errorMsg);
      console.error(errorMsg);
    }

    const success = details.errors.length === 0;
    const message = success
      ? `Successfully initialized ${details.tabsCreated.length + details.tabsUpdated.length} tabs`
      : `Initialization completed with ${details.errors.length} errors`;

    return {
      success,
      message,
      details
    };

  } catch (error) {
    console.error("Error initializing Google Sheets:", error);
    return {
      success: false,
      message: `Failed to initialize sheets: ${error}`,
      details
    };
  }
}

/**
 * Verify that Google Sheets credentials are working
 */
export async function verifyGoogleSheetsAccess(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const sheets = await getSheetsClient();

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEETS.SPREADSHEET_ID
    });

    if (spreadsheet.data) {
      return {
        success: true,
        message: `Successfully connected to spreadsheet: ${spreadsheet.data.properties?.title || "Unknown"}`
      };
    }

    return {
      success: false,
      message: "Could not access spreadsheet data"
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to access Google Sheets: ${error}`
    };
  }
}
