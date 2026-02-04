# Export Scripts

## One-Time Customer Export

This script allows you to export ALL customers from UK and DACH regions to CSV files locally.

**Important:** This is separate from the main Odoo tracking system and does NOT:
- Save to Google Sheets
- Update Redis state
- Affect the daily automated scraping

### Usage

```bash
# Export UK customers (36 pages, ~2-3 minutes)
npm run export:uk

# Export DACH customers (258 pages, ~10-12 minutes)
npm run export:dach

# Export both UK and DACH
npm run export:all
```

### Output

CSV files are saved to the `exports/` directory with the format:
- `uk-customers-YYYY-MM-DD.csv`
- `dach-customers-YYYY-MM-DD.csv`

### CSV Format

```
Detection Date,Company Name,Industry,Country,Description,Detail URL
2025-02-04,Company Name,Industry,Country,Description,https://...
```

### What Gets Scraped

**UK:** 36 pages total
- United Kingdom: 36 pages

**DACH:** 258 pages total
- Germany (Deutschland): 115 pages
- Austria (Österreich): 40 pages
- Switzerland (Schweiz): 103 pages

### Notes

- The script adds a 2-second delay between pages to be respectful to Odoo's servers
- Progress is shown in real-time in the console
- Errors are logged but don't stop the export
- CSV files use proper escaping for quotes and commas
- Detection date is set to the current date for all customers

### Troubleshooting

**Script fails with TypeScript error:**
```bash
# Make sure tsx is installed
npm install
```

**Network timeout errors:**
- The script will continue and log errors
- You can re-run the script to get a complete export

**Output directory not found:**
- The script creates the `exports/` directory automatically
- Make sure you have write permissions in the project directory
