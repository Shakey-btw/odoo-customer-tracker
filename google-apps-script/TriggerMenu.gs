/**
 * Google Apps Script for Odoo Customer Tracker
 *
 * INSTALLATION INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/12ANpkqMGXtnT9jtx5xFRWT7Ycdm7Yh2jxNlzBE2Op-o/edit
 * 2. Click "Extensions" → "Apps Script"
 * 3. Delete any existing code in the editor
 * 4. Copy and paste this entire file
 * 5. Click the save icon (💾) or press Ctrl+S / Cmd+S
 * 6. Close the Apps Script tab
 * 7. Refresh your Google Sheet
 * 8. You should see a new "Odoo Tracker" menu in the menu bar
 * 9. First time you use it, Google will ask for permissions - click "Allow"
 *
 * The menu will appear between "Help" and your profile icon.
 */

// Configuration
const API_CONFIG = {
  BASE_URL: 'https://odoo-customer-tracker.vercel.app',
  CRON_SECRET: '7664e2eb2d4c8550759252e0df11d47e7bae2763aea4b4973775f77920014848'
};

/**
 * Runs when the spreadsheet is opened
 * Creates the custom menu
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Odoo Tracker')
    .addItem('🚀 Trigger Scrape Now', 'triggerScrapeNow')
    .addSeparator()
    .addItem('📊 View Last Run Status', 'showLastRunStatus')
    .addSeparator()
    .addItem('ℹ️ About', 'showAbout')
    .addToUi();
}

/**
 * Triggers an immediate scraping run
 */
function triggerScrapeNow() {
  const ui = SpreadsheetApp.getUi();

  // Confirm with user
  const response = ui.alert(
    'Trigger Scraping Run',
    'This will start checking Odoo for new customers across all targets (All, DACH, UK).\n\n' +
    'The process may take several minutes. Results will appear in the customer tabs and Scraping Log.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  // Show progress message
  ui.alert('⏳ Scraping Started',
           'The scraping process has been triggered!\n\n' +
           'Check the "Scraping Log" tab in a few minutes to see the results.\n\n' +
           'You can continue working - the scraping runs in the background.',
           ui.ButtonSet.OK);

  try {
    // Call the API endpoint
    const url = `${API_CONFIG.BASE_URL}/api/cron/check-customers`;

    const options = {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.CRON_SECRET}`,
        'x-cron-secret': API_CONFIG.CRON_SECRET
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode === 200) {
      Logger.log('Scraping triggered successfully');
    } else {
      Logger.log(`API returned status ${statusCode}: ${response.getContentText()}`);
      ui.alert('⚠️ Warning',
               `The API returned status code ${statusCode}. Check the Scraping Log tab to see if it completed.`,
               ui.ButtonSet.OK);
    }

  } catch (error) {
    Logger.log('Error triggering scrape: ' + error);
    ui.alert('❌ Error',
             'Failed to trigger scraping: ' + error.message + '\n\n' +
             'Please try again or contact the administrator.',
             ui.ButtonSet.OK);
  }
}

/**
 * Shows the status of the last scraping run
 */
function showLastRunStatus() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = sheet.getSheetByName('Scraping Log');

  if (!logSheet) {
    ui.alert('No Log Found',
             'The "Scraping Log" tab doesn\'t exist yet.\n\n' +
             'Run a scrape first to see results.',
             ui.ButtonSet.OK);
    return;
  }

  // Get the last 3 rows (excluding header)
  const lastRow = logSheet.getLastRow();

  if (lastRow <= 1) {
    ui.alert('No Runs Yet',
             'No scraping runs have been logged yet.\n\n' +
             'Use "Trigger Scrape Now" to run the first check.',
             ui.ButtonSet.OK);
    return;
  }

  // Get last 3 entries (or fewer if less than 3 exist)
  const numEntries = Math.min(3, lastRow - 1);
  const startRow = lastRow - numEntries + 1;
  const data = logSheet.getRange(startRow, 1, numEntries, 5).getValues();

  // Format the status message
  let message = 'Last ' + numEntries + ' scraping run(s):\n\n';

  data.reverse().forEach((row, index) => {
    const [timestamp, target, customersFound, newCustomers, status] = row;
    const icon = status === 'Success' ? '✅' : '❌';
    const newText = newCustomers > 0 ? ` (${newCustomers} new!)` : ' (no new)';

    message += `${icon} ${target}: ${customersFound} customers${newText}\n`;
    message += `   ${timestamp}\n\n`;
  });

  message += 'Check the "Scraping Log" tab for full history.';

  ui.alert('📊 Recent Activity', message, ui.ButtonSet.OK);
}

/**
 * Shows information about the tracker
 */
function showAbout() {
  const ui = SpreadsheetApp.getUi();

  const message =
    '🤖 Odoo Customer Tracker\n\n' +
    'Automatically tracks new companies from Odoo customer pages.\n\n' +
    '📋 Features:\n' +
    '• Daily automated checks at 4:00 AM CEST\n' +
    '• Manual trigger available via this menu\n' +
    '• Tracks 3 targets: All, DACH, UK\n' +
    '• Logs all activity to "Scraping Log" tab\n\n' +
    '📊 Tabs:\n' +
    '• All - All customers worldwide\n' +
    '• DACH - Germany, Austria, Switzerland\n' +
    '• UK - United Kingdom\n' +
    '• Scraping Log - Activity history\n\n' +
    '🌐 Dashboard:\n' +
    'https://odoo-customer-tracker.vercel.app\n\n' +
    'Built with Next.js, Redis, and Google Sheets API';

  ui.alert('About Odoo Tracker', message, ui.ButtonSet.OK);
}

/**
 * Test function to verify API connectivity
 * Only visible in Apps Script editor, not in the menu
 */
function testAPIConnection() {
  try {
    const url = `${API_CONFIG.BASE_URL}/api/cron/check-customers`;

    const options = {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.CRON_SECRET}`,
        'x-cron-secret': API_CONFIG.CRON_SECRET
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const content = response.getContentText();

    Logger.log('Status Code: ' + statusCode);
    Logger.log('Response: ' + content);

    return {
      success: statusCode === 200,
      statusCode: statusCode,
      response: content
    };

  } catch (error) {
    Logger.log('Error: ' + error);
    return {
      success: false,
      error: error.message
    };
  }
}
