# Google Apps Script - Custom Menu for Sheet Triggering

This script adds a custom menu to your Google Sheet that allows you to manually trigger scraping runs directly from the spreadsheet.

## Installation

1. **Open your Google Sheet**
   - Go to: https://docs.google.com/spreadsheets/d/12ANpkqMGXtnT9jtx5xFRWT7Ycdm7Yh2jxNlzBE2Op-o/edit

2. **Open Apps Script Editor**
   - Click `Extensions` → `Apps Script` in the menu bar

3. **Add the Script**
   - Delete any existing code in the editor
   - Copy the entire contents of `TriggerMenu.gs`
   - Paste it into the Apps Script editor

4. **Save the Script**
   - Click the save icon (💾) or press `Ctrl+S` / `Cmd+S`
   - Give it a name like "Odoo Tracker Menu" (optional)

5. **Close and Refresh**
   - Close the Apps Script tab
   - Go back to your Google Sheet
   - Refresh the page (`F5` or `Cmd+R`)

6. **See the Menu**
   - You should now see **"Odoo Tracker"** in the menu bar (between "Help" and your profile)

7. **Grant Permissions (First Use Only)**
   - Click `Odoo Tracker` → `🚀 Trigger Scrape Now`
   - Google will ask for permissions
   - Click `Continue` → `Allow`
   - This only happens once

## Menu Options

### 🚀 Trigger Scrape Now
- Immediately starts a scraping run for all targets (All, DACH, UK)
- Shows a confirmation dialog before starting
- Process runs in the background
- Results appear in the "Scraping Log" tab within a few minutes

### 📊 View Last Run Status
- Shows the last 3 scraping runs
- Displays timestamp, target, customers found, and new customers
- Quick way to check if the scraper is working

### ℹ️ About
- Shows information about the tracker
- Lists features and dashboard link

## How It Works

When you click "Trigger Scrape Now":

1. **Confirmation Dialog** - Asks if you want to proceed
2. **API Call** - Calls your Vercel API endpoint with authentication
3. **Background Processing** - The scraper runs on Vercel (takes 5-15 minutes)
4. **Results** - New customers appear in customer tabs, activity in "Scraping Log"

## Troubleshooting

### Menu doesn't appear
- Make sure you refreshed the page after adding the script
- Try closing and reopening the Google Sheet
- Check that the script was saved successfully

### "Permission denied" error
- Click `Odoo Tracker` → any option
- Follow the permission prompts
- You may need to click "Advanced" → "Go to Odoo Tracker (unsafe)" if Google shows a warning

### API errors
- Check that the CRON_SECRET in the script matches your environment variable
- Verify the BASE_URL is correct: `https://odoo-customer-tracker.vercel.app`
- Check Vercel logs for errors

### Script not working
- Open `Extensions` → `Apps Script`
- Click `Executions` in the left sidebar
- Check for error messages
- Use the `testAPIConnection()` function to debug

## Security Note

The `CRON_SECRET` is hardcoded in the script. This is necessary for authentication but means anyone with edit access to the script can see it. Only share the Google Sheet with trusted team members, or use View-only access for others.

## Updates

If you need to update the script later:
1. Open `Extensions` → `Apps Script`
2. Make your changes
3. Save (`Ctrl+S` / `Cmd+S`)
4. Refresh the Google Sheet

Changes take effect immediately after refresh.
