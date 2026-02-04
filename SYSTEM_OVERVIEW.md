# Odoo Customer Tracker - System Overview

## 📋 What This System Does (Non-Technical)

This is an automated tracking system that monitors Odoo's public customer pages (https://www.odoo.com/de_DE/customers) and alerts you when new companies are added.

**Key Features:**
- Automatically checks for new customers **every day at 4:00 AM CEST**
- Tracks three separate lists: **All customers**, **DACH region** (Germany/Austria/Switzerland), and **UK**
- Saves all new companies to a **Google Sheet** with company name, industry, country, and description
- Can be triggered **manually** from the Google Sheet menu
- Shows **live history** on a web dashboard

**Think of it like a robot that:**
1. Visits the Odoo customer pages every morning
2. Compares what it sees to what it's seen before
3. Writes down any new companies in your spreadsheet
4. Remembers everything so it doesn't show you the same company twice

---

## 🎯 How It Works (High-Level)

### Daily Process

```
4:00 AM CEST
     ↓
System wakes up automatically
     ↓
Checks first 5-10 pages of each target
     ↓
Compares against previously seen customers
     ↓
Writes NEW customers to Google Sheets
     ↓
Updates history log
     ↓
Goes back to sleep
```

### What Gets Checked Daily

| Target | Pages Checked | Why This Amount? |
|--------|---------------|------------------|
| All Customers | First 5 pages (~50 companies) | New companies appear on early pages |
| DACH | First 10 pages per country (30 pages total) | Focused regional tracking |
| UK | All 36 pages | Small enough to check everything |

### How It Avoids Duplicates

The system creates a unique "fingerprint" for each company using:
- Company name
- Country
- Industry

It stores these fingerprints in a database (Redis) and checks against them before adding anything new to your Google Sheet.

---

## 🛠️ Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel (Hosting)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cron Job (2:00 AM UTC / 4:00 AM CEST)              │  │
│  │  Triggers: /api/cron/check-customers                 │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Orchestrator                                         │  │
│  │  - Determines which pages to check                   │  │
│  │  - Queues 71 scraping jobs to QStash                 │  │
│  │  - Adds delays to avoid rate limiting                │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Worker Functions (71 parallel instances)            │  │
│  │  - Each scrapes ONE page                             │  │
│  │  - Parses customer data with Cheerio                 │  │
│  │  - Checks Redis for duplicates                       │  │
│  │  - Writes new customers to Google Sheets             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           ↓                  ↓                  ↓
    ┌──────────┐      ┌──────────┐      ┌──────────────┐
    │  QStash  │      │  Redis   │      │ Google Sheets│
    │ (Queue)  │      │ (Memory) │      │  (Storage)   │
    └──────────┘      └──────────┘      └──────────────┘
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 14+ (TypeScript) | Web application framework |
| **Hosting** | Vercel Pro | Cloud hosting with cron jobs |
| **HTML Parsing** | Cheerio | Lightweight scraping (no browser needed) |
| **Job Queue** | Upstash QStash | Distributes work across serverless functions |
| **State Storage** | Upstash Redis | Tracks seen customers (deduplication) |
| **Data Output** | Google Sheets API | Saves customer data |
| **Authentication** | Google Service Account | Automated Google Sheets access |

### Why This Architecture?

**Problem:** Vercel functions timeout after 60 seconds, but checking 4,000+ pages would take hours.

**Solution:** Queue-based architecture
1. **Orchestrator** (5 seconds): Decides which pages to check, queues 71 jobs
2. **Workers** (50 seconds each): Each processes ONE page independently
3. **QStash**: Manages job distribution and delays between requests

---

## 📁 Project Structure

### Key Files

```
Signal-Tracking-Bot/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   └── check-customers/
│   │   │       └── route.ts          # Orchestrator (queues jobs)
│   │   ├── scrape/
│   │   │   └── worker/
│   │   │       └── route.ts          # Worker (scrapes one page)
│   │   ├── history/
│   │   │   └── route.ts              # History API for dashboard
│   │   └── setup/
│   │       └── init-sheets/
│   │           └── route.ts          # One-time Google Sheets setup
│   └── page.tsx                      # Dashboard UI
│
├── lib/
│   ├── config/
│   │   ├── constants.ts              # Configuration values
│   │   └── targets.ts                # Target definitions (All/DACH/UK)
│   ├── google-sheets/
│   │   ├── auth.ts                   # Google Sheets authentication
│   │   ├── writer.ts                 # Write customers to sheets
│   │   └── initializer.ts            # Create tabs and headers
│   ├── scraper/
│   │   ├── cheerio-scraper.ts        # HTML parsing logic
│   │   ├── parser.ts                 # Extract customer data
│   │   └── url-builder.ts            # Build Odoo URLs
│   └── state/
│       ├── redis.ts                  # Redis client
│       ├── seen-tracker.ts           # Duplicate detection
│       └── hash.ts                   # Customer fingerprinting
│
├── types/
│   ├── customer.ts                   # Customer data types
│   ├── target.ts                     # Target types
│   └── scraping.ts                   # Job types
│
├── google-apps-script/
│   └── TriggerMenu.gs                # Google Sheets menu (manual trigger)
│
└── vercel.json                       # Vercel configuration (cron schedule)
```

### Important Configuration Files

**vercel.json** - Deployment configuration
```json
{
  "crons": [{
    "path": "/api/cron/check-customers",
    "schedule": "0 2 * * *"  // 2:00 AM UTC = 4:00 AM CEST
  }],
  "functions": {
    "app/api/scrape/worker/route.ts": { "maxDuration": 60 },
    "app/api/cron/check-customers/route.ts": { "maxDuration": 60 }
  }
}
```

**lib/config/constants.ts** - System settings
```typescript
INCREMENTAL_PAGES: {
  all: 5,      // Check first 5 pages daily
  dach: 10,    // Check first 10 pages per country
  uk: 36       // Check all pages (small enough)
}
```

**lib/config/targets.ts** - Target definitions
- URLs for each region
- Country IDs for filtering
- Page counts
- Google Sheets tab names

---

## 🔧 Services & Tools Used

### 1. Upstash Redis (Free Tier)
**Purpose:** State management - tracks which customers have been seen

**What it stores:**
- `seen:all` - Set of customer hashes for "All" target
- `seen:dach` - Set of customer hashes for "DACH" target
- `seen:uk` - Set of customer hashes for "UK" target
- `last_check:*` - Timestamp of last check for each target
- `history:*` - Last 100 scraping runs for each target

**Free tier limits:** 10,000 commands/day (we use ~500/day)

### 2. Upstash QStash (Free Tier)
**Purpose:** Job queue - distributes work across serverless functions

**How it works:**
1. Orchestrator publishes 71 jobs to QStash
2. Each job has a delay (60 seconds between pages)
3. QStash calls the worker function for each job
4. Workers process independently

**Free tier limits:** 1,000 messages/day (we use 71/day)

**Message consumption per run:**
- All: 5 messages
- DACH: 30 messages (10 × 3 countries)
- UK: 36 messages
- **Total: 71 messages per run**

### 3. Google Sheets API (Free)
**Purpose:** Data storage and visualization

**Sheet structure:**
```
Spreadsheet: Odoo Customer Tracker
├── All (tab)
│   └── Columns: Detection Date | Company Name | Industry | Country | Description | Detail URL
├── DACH (tab)
│   └── Columns: Detection Date | Company Name | Industry | Country | Description | Detail URL
├── UK (tab)
│   └── Columns: Detection Date | Company Name | Industry | Country | Description | Detail URL
└── Scraping Log (tab)
    └── Columns: Timestamp (CEST) | Target | Customers Found | New Customers | Status | Error Message
```

**Authentication:** Service account with Editor permissions

**Rate limits:** 300 requests/minute (we use ~3/day)

### 4. Vercel Pro ($20/month)
**Purpose:** Hosting and cron jobs

**Why Pro tier needed:**
- 60-second function timeout (Hobby has 10s, too short)
- Cron jobs included
- 100 hours/month compute time (we use ~10 hours)

**Functions:**
- `check-customers` - Orchestrator (runs daily via cron)
- `worker` - Scraping worker (called by QStash)
- `history` - API for dashboard
- `init-sheets` - One-time setup

---

## 🚀 How to Use

### Automated Daily Checks

The system runs automatically every day at **4:00 AM CEST** (2:00 AM UTC). No action needed.

**You'll receive:**
- New customers in Google Sheets (appropriate tabs)
- Log entry in "Scraping Log" tab
- History entry on dashboard

### Manual Trigger from Google Sheets

1. Open the Google Sheet
2. Click **"Odoo Tracker"** menu (top menu bar)
3. Click **"🚀 Trigger Scrape Now"**
4. Confirm when prompted
5. Check "Scraping Log" tab in 5-10 minutes

### View Dashboard

Visit: https://odoo-customer-tracker.vercel.app

**Dashboard shows:**
- Recent scraping runs
- Number of new customers found
- Status (Success/Error)
- Timestamp in CEST

### Monitor Logs

**Vercel Logs:**
1. Go to https://vercel.com/dashboard
2. Select "odoo-customer-tracker" project
3. Click "Logs" tab
4. Filter by function: `check-customers` or `worker`

**Search for:**
- `[Orchestrator]` - Orchestrator logs
- `[Worker]` - Worker logs
- `FATAL ERROR` - Critical errors

---

## 🔍 How Duplicate Detection Works

### Customer Hashing

Each customer gets a unique fingerprint:

```typescript
hash = `${name.toLowerCase().trim()}|${country.toLowerCase().trim()}|${industry.toLowerCase().trim()}`

Example: "deutsche bank|deutschland|finanzdienstleistungen"
```

### Detection Flow

```
New customer found on page
        ↓
Generate hash
        ↓
Check Redis: Is hash in seen:all set?
        ↓
    ┌───┴───┐
   Yes      No
    ↓        ↓
  Skip    Add to Google Sheets
           ↓
        Add hash to Redis
```

### Why This Works

- **Fast lookups:** Redis Set operations are O(1)
- **Reliable:** Hash includes key identifying fields
- **Persistent:** Redis data persists across runs
- **No duplicates:** Each hash can only exist once in a Set

---

## 📊 Data Flow Example

### Complete Scraping Run

**4:00 AM CEST - Cron triggers**

```
1. Orchestrator starts
   - Reads config: check 5 pages for "all"
   - Queues 5 jobs to QStash
   - Job 1: delay 60s
   - Job 2: delay 120s
   - Job 3: delay 180s
   - Job 4: delay 240s
   - Job 5: delay 300s

2. Worker 1 starts (after 60s delay)
   - Fetches: https://www.odoo.com/de_DE/customers?page=1
   - Parses HTML with Cheerio
   - Finds 20 customers
   - Generates 20 hashes
   - Checks Redis: 18 seen, 2 new
   - Writes 2 new customers to Google Sheets
   - Logs: "ALL: 20 found, 2 new"
   - Updates Redis history

3. Worker 2 starts (after 120s delay)
   - Fetches page 2
   - [same process]

... (repeat for remaining workers)

4. All workers complete
   - Google Sheets has all new customers
   - Scraping Log shows summary
   - Dashboard updates
   - Redis contains all seen hashes
```

---

## 🐛 Troubleshooting

### No New Customers Found

**Possible causes:**
1. **No new customers added to Odoo** - This is normal, check again next day
2. **Already seen before** - Check Redis `seen:*` keys
3. **Scraping failed** - Check "Scraping Log" for errors

**How to verify:**
- Visit https://www.odoo.com/de_DE/customers manually
- Compare with your Google Sheet "All" tab
- If you see companies not in sheet, check error logs

### QStash Rate Limit Exceeded

**Error message:** `Exceeded daily rate limit. {"limit":"1000","remaining":"0"}`

**Cause:** Used up 1,000 QStash messages (free tier limit)

**Solution:**
1. Wait until midnight UTC (1:00 AM CET) for reset
2. Avoid triggering multiple manual runs per day
3. Consider upgrading to QStash paid plan (~$10/month)

### Function Timeout (504 Error)

**Possible causes:**
1. Odoo website slow to respond
2. Worker taking too long to parse
3. Network issues

**Solution:**
- System automatically retries failed pages
- Check Vercel logs for specific error
- Retry manually from Google Sheets menu

### Google Sheets Not Updating

**Possible causes:**
1. Service account lost Editor permissions
2. Google Sheets API credentials expired
3. Sheet was renamed or deleted

**How to fix:**
1. Check if service account email has Editor access
2. Verify `GOOGLE_SHEETS_CREDENTIALS` env var in Vercel
3. Check sheet ID matches in `lib/config/constants.ts`

### Redis Connection Failed

**Error message:** `Missing Upstash Redis credentials`

**Cause:** Environment variables not set or contain whitespace

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Make sure no trailing spaces or newlines
4. Redeploy

---

## 🔐 Environment Variables

Required in Vercel for production:

```bash
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Upstash QStash
QSTASH_TOKEN=your-qstash-token

# Google Sheets
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":...}

# Security
CRON_SECRET=random-secret-string
```

**Important:** No trailing spaces or newlines! The code uses `.trim()` to handle this, but it's best to avoid it.

---

## 📈 System Metrics

### Performance

- **Orchestrator duration:** 5-10 seconds
- **Worker duration:** 5-15 seconds per page
- **Total runtime:** ~10 minutes (with delays)
- **Pages checked:** 71 pages per run
- **Customers checked:** ~1,000-1,500 per run

### Resource Usage

**QStash:**
- Daily: 71 messages
- Monthly: ~2,130 messages
- Free tier: 1,000/day ✅

**Redis:**
- Commands per run: ~500
- Storage: ~5 MB (50,000 hashes)
- Free tier: 10,000 commands/day ✅

**Vercel:**
- Compute time: ~10 hours/month
- Function invocations: ~2,000/month
- Pro tier: 100 hours/month ✅

**Google Sheets:**
- API calls: ~3-5 per run
- Daily: ~5 calls
- Free tier: 300/minute ✅

### Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Upstash Redis | Free | $0 |
| Upstash QStash | Free | $0 |
| Google Sheets API | Free | $0 |
| Vercel | Pro | $20 |
| **Total** | | **$20/month** |

---

## 🔄 System Lifecycle

### Initial Setup (One Time)

1. Deploy to Vercel
2. Set environment variables
3. Run `/api/setup/init-sheets` to create Google Sheets tabs
4. Add Google Apps Script to Google Sheet
5. Wait for first cron run

### Daily Operation

```
02:00 UTC - Vercel Cron triggers orchestrator
02:01 UTC - 71 jobs queued to QStash
02:01 UTC - First worker starts (after 60s delay)
02:10 UTC - All workers complete
02:10 UTC - Google Sheets updated
02:10 UTC - Dashboard shows new data
```

### Maintenance

- **None required** - System is fully automated
- Monitor "Scraping Log" tab for errors
- Check QStash usage if approaching 1,000/day limit

---

## 💡 Design Decisions

### Why Incremental Scans Only?

**Original plan:** Full scan of all 4,282 pages weekly, incremental daily

**Why changed:**
- Assumption: Odoo likely sorts customers with newest first
- Incremental scans should catch all new customers
- Full scans would use 4,576 QStash messages (exceeding free tier)
- Simpler logic, lower cost

**Risk:** If Odoo sorts alphabetically, new customers could appear on page 1000

**Mitigation:** Monitor Google Sheets for a few weeks. If we miss customers, add back full scans or increase incremental page count.

### Why 60 Second Delays?

**Purpose:** Avoid rate limiting by Odoo

**How it works:**
- Page 1: no delay
- Page 2: 60s delay
- Page 3: 120s delay
- Plus ±20% jitter to randomize

**Result:** Spreads 71 requests over ~10 minutes instead of hammering server

### Why Cheerio Instead of Puppeteer?

**Cheerio:** Lightweight HTML parser, no browser needed

**Pros:**
- Fast (milliseconds vs seconds)
- Low memory (<50 MB vs 500 MB)
- Cheaper (works within 60s timeout)

**Cons:**
- Can't handle JavaScript-rendered content

**Decision:** Odoo pages are server-rendered HTML, so Cheerio works perfectly

---

## 🎓 For Developers

### Running Locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev

# Test orchestrator locally
curl http://localhost:3000/api/cron/check-customers \
  -H "Authorization: Bearer your-cron-secret"
```

### Adding New Targets

1. Edit `lib/config/targets.ts`
2. Add new target config with URL, countries, pages
3. Update `types/target.ts` to include new target name
4. Add new tab to Google Sheets
5. Update orchestrator to include new target

### Modifying Incremental Page Count

Edit `lib/config/constants.ts`:

```typescript
INCREMENTAL_PAGES: {
  all: 10,    // Was 5, now checking 10 pages
  dach: 15,   // Was 10, now checking 15 per country
  uk: 36      // Unchanged
}
```

Redeploy to Vercel.

### Testing Without QStash

For local testing, comment out QStash publishing and call worker directly:

```typescript
// Instead of qstash.publishJSON(...)
await fetch('http://localhost:3000/api/scrape/worker', {
  method: 'POST',
  body: JSON.stringify(job)
})
```

---

## 📝 Change Log

### 2025-02-04 - v1.1
- ✅ Removed full scan logic (simplified to incremental only)
- ✅ Added detailed error messages to Google Sheets
- ✅ Fixed QStash rate limit issues
- ✅ Improved error logging to Redis history

### 2025-02-03 - v1.0
- ✅ Initial deployment
- ✅ Automated daily scraping
- ✅ Google Sheets integration
- ✅ Manual trigger from Google Sheet
- ✅ Dashboard with history

---

## 📞 Support

### Common Questions

**Q: Can I change the cron schedule?**
A: Yes, edit `vercel.json` and redeploy. Use cron syntax: https://crontab.guru

**Q: Can I add more regions?**
A: Yes, edit `lib/config/targets.ts` and add new target configs

**Q: Can I increase pages checked?**
A: Yes, but watch QStash usage. Each page = 1 message. Free tier = 1,000/day

**Q: What happens if Redis goes down?**
A: All customers will be marked as "new" on next run (one-time duplication)

**Q: Can I export from Google Sheets?**
A: Yes, File → Download as CSV/Excel/PDF

---

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Upstash Redis](https://upstash.com/) - Serverless Redis
- [Upstash QStash](https://upstash.com/docs/qstash) - Message queue
- [Google Sheets API](https://developers.google.com/sheets/api) - Data storage
- [Vercel](https://vercel.com/) - Hosting platform

---

**Last Updated:** February 4, 2025
**Version:** 1.1
**Maintained By:** Nils Hagendorn
