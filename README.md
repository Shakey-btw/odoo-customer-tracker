# Odoo Customer Tracking Bot

An automated system that tracks new companies added to [Odoo's customer pages](https://www.odoo.com/de_DE/customers) and logs them in Google Sheets. The bot monitors three separate tracking targets:

- **All customers** - All companies across all industries and countries
- **DACH** - Companies from Germany, Austria, and Switzerland
- **UK** - Companies from the United Kingdom

## Features

- **Automated Daily Checks**: Runs automatically every day at 2 AM UTC via Vercel Cron
- **Smart Scraping Strategy**:
  - Daily incremental scans (first 5-10 pages)
  - Weekly full scans (all pages) on Sundays
- **Duplicate Detection**: Uses Redis to track seen customers and avoid duplicates
- **Google Sheets Integration**: New customers automatically appear in your spreadsheet
- **Scalable Architecture**: Queue-based system handles thousands of pages without timeout issues
- **Three Separate Tabs**: Organized tracking for All, DACH, and UK customers

## Architecture

```
Daily Cron (2 AM UTC)
    ↓
Orchestrator (/api/cron/check-customers)
    ↓
Queue Pages → Upstash QStash
    ↓
Worker Functions (/api/scrape/worker)
    ↓
Scrape Page → Parse Customers → Check Redis
    ↓
New Customers → Google Sheets
```

## Tech Stack

- **Next.js 14+** with TypeScript (App Router)
- **Cheerio** for HTML parsing
- **Upstash Redis** for state management
- **Upstash QStash** for job queuing
- **Google Sheets API** for data storage
- **Vercel** for hosting and cron jobs

## Prerequisites

- Node.js 18+ installed
- Vercel account (Pro plan recommended for 60s function timeout)
- Upstash account (free tier sufficient for Redis)
- Upstash QStash account (paid plan needed for weekly full scans)
- Google Cloud project with Sheets API enabled
- Service account credentials for Google Sheets

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd Signal-Tracking-Bot
npm install
```

### 2. Set Up Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/redis)
2. Click "Create Database"
3. Choose a region close to your Vercel deployment
4. Copy the REST URL and REST TOKEN

### 3. Set Up Upstash QStash

1. Go to [Upstash QStash Console](https://console.upstash.com/qstash)
2. Copy your QStash Token
3. Copy the Current Signing Key and Next Signing Key

### 4. Set Up Google Sheets API

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "New Project"
3. Name it "Odoo Tracker Bot" (or any name you prefer)
4. Wait for project creation to complete

#### Step 2: Enable Google Sheets API

1. In your project, navigate to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

#### Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in the details:
   - **Service account name**: `odoo-tracker-bot`
   - **Service account ID**: (auto-generated)
   - **Description**: Optional
4. Click "Create and Continue"
5. Skip the optional steps (no role needed)
6. Click "Done"

#### Step 4: Generate Service Account Key

1. In the Credentials page, find your service account
2. Click on it to open details
3. Go to the "Keys" tab
4. Click "Add Key" → "Create New Key"
5. Select "JSON" format
6. Click "Create"
7. **Save the downloaded JSON file securely** - you'll need it for environment variables

#### Step 5: Share Google Sheet with Service Account

1. Open your Google Sheet at: https://docs.google.com/spreadsheets/d/12ANpkqMGXtnT9jtx5xFRWT7Ycdm7Yh2jxNlzBE2Op-o/edit
2. Click the "Share" button (top right)
3. In the downloaded JSON file, find the `client_email` field (looks like `odoo-tracker-bot@project-id.iam.gserviceaccount.com`)
4. Paste this email into the share dialog
5. Give it "Editor" permission
6. **Uncheck** "Notify people"
7. Click "Share"

### 5. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all values:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Upstash QStash
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key

# Google Sheets - paste entire JSON contents
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}

# Vercel (auto-set in production)
VERCEL_URL=localhost:3000

# Cron Secret (generate a random string)
CRON_SECRET=your-random-secret-key
```

**Important**: For `GOOGLE_SHEETS_CREDENTIALS`, paste the **entire contents** of your service account JSON file as a single line.

### 6. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Option B: Using GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Vercel will auto-deploy

#### Set Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add each variable from your `.env.local` file:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
   - `GOOGLE_SHEETS_CREDENTIALS`
   - `CRON_SECRET`
4. Make sure to set them for "Production" environment
5. Redeploy if already deployed

### 7. Initialize Google Sheets

Once deployed, call the initialization endpoint to set up your sheets:

```bash
curl https://your-app.vercel.app/api/setup/init-sheets
```

This will:
- Create three tabs: "All", "DACH", "UK"
- Add headers to each tab
- Format the header row (bold, frozen)

### 8. Verify Setup

#### Test the scraper manually:

```bash
curl -X POST https://your-app.vercel.app/api/scrape/worker \
  -H "Content-Type: application/json" \
  -d '{"target":"uk","country":"United Kingdom","countryId":222,"page":1,"timestamp":1234567890}'
```

#### Trigger the cron manually:

```bash
curl https://your-app.vercel.app/api/cron/check-customers \
  -H "Authorization: Bearer your-cron-secret"
```

#### Check Google Sheets:

Open your spreadsheet and verify:
- All three tabs exist
- Headers are present
- New customers appear after running the cron

## How It Works

### Daily Incremental Scans (Mon-Sat)

The bot checks the **first few pages** of each target daily:
- **All**: First 5 pages (~50 customers)
- **DACH**: First 10 pages per country (30 pages total)
- **UK**: All 36 pages (small enough to check everything)

This catches ~95% of new customers since they typically appear at the beginning of the list.

### Weekly Full Scans (Sunday)

Once per week, the bot scans **all pages** for all targets:
- **All**: 4,282 pages (~47,000 customers)
- **DACH**: 258 pages (~2,580 customers)
- **UK**: 36 pages (~360 customers)

This ensures no new customers are missed, even if they appear deep in the pagination.

### Duplicate Detection

Each customer gets a unique hash based on:
```
hash = "{name}|{country}|{industry}"
```

Hashes are stored in Redis Sets:
- `seen:all` - All customers seen
- `seen:dach` - DACH customers seen
- `seen:uk` - UK customers seen

Before adding a customer to Google Sheets, the bot checks if the hash exists in Redis. If it does, the customer is skipped (already seen). If not, it's added to both Redis and Google Sheets.

### Rate Limiting

Requests are spread over time to be polite to Odoo's servers:
- **60 seconds** between page requests
- Random jitter (±20%) to avoid patterns
- QStash handles scheduling automatically

## Project Structure

```
Signal-Tracking-Bot/
├── app/
│   └── api/
│       ├── cron/
│       │   └── check-customers/
│       │       └── route.ts          # Cron orchestrator
│       ├── scrape/
│       │   └── worker/
│       │       └── route.ts          # Scraping worker
│       └── setup/
│           └── init-sheets/
│               └── route.ts          # Sheet initialization
├── lib/
│   ├── scraper/
│   │   ├── cheerio-scraper.ts        # HTML parsing with Cheerio
│   │   └── url-builder.ts            # URL construction
│   ├── state/
│   │   ├── redis.ts                  # Redis client
│   │   ├── seen-tracker.ts           # Customer tracking
│   │   └── hash.ts                   # Hash generation
│   ├── google-sheets/
│   │   ├── auth.ts                   # Google auth
│   │   ├── writer.ts                 # Write to sheets
│   │   └── initializer.ts            # Sheet setup
│   └── config/
│       ├── targets.ts                # Target configs
│       └── constants.ts              # App constants
├── types/
│   ├── customer.ts                   # Customer types
│   ├── target.ts                     # Target types
│   └── scraping.ts                   # Scraping types
├── package.json
├── tsconfig.json
├── next.config.js
├── vercel.json                       # Cron configuration
└── README.md
```

## Monitoring

### Vercel Dashboard

View logs and function executions:
1. Go to your project in Vercel Dashboard
2. Click "Logs" or "Functions"
3. Filter by function name to see specific execution logs

### Upstash Dashboard

Monitor Redis usage:
1. Go to [Upstash Console](https://console.upstash.com/redis)
2. Select your database
3. View metrics: commands/day, storage, connections

Monitor QStash queue:
1. Go to [Upstash QStash Console](https://console.upstash.com/qstash)
2. View messages, retries, failures

### Google Sheets

Simply open your spreadsheet to see new customers appearing:
- **All** tab: All detected customers
- **DACH** tab: Germany, Austria, Switzerland customers
- **UK** tab: United Kingdom customers

## Cost Estimates

### Monthly Costs

**Upstash Redis** (Free tier):
- 10K commands/day limit
- Actual usage: ~1K commands/day
- **Cost: $0**

**Upstash QStash** (Paid required):
- Free tier: 500 messages/day
- Daily incremental: ~71 messages
- Weekly full scan: ~4,576 messages
- Need paid plan for full scans
- **Cost: ~$10/month**

**Vercel Pro** (Required):
- Hobby plan timeout (10s) is too short
- Pro plan: 60s timeout, 100 hours compute/month
- Daily usage: ~12 hours/day average
- **Cost: $20/month**

**Google Sheets API**:
- Free with 300 requests/minute quota
- Actual usage: ~3 requests/day
- **Cost: $0**

**Total: ~$30/month**

## Troubleshooting

### Customers not appearing in Google Sheets

1. Check service account permissions:
   - Verify the service account email has "Editor" access to the sheet
   - Check the `client_email` in your credentials JSON

2. Check environment variables:
   - Ensure `GOOGLE_SHEETS_CREDENTIALS` is properly formatted JSON
   - Try logging the parsed credentials in code to verify

3. Check Vercel logs:
   - Look for errors in function execution logs
   - Search for "Google Sheets" or "append" errors

### Cron not running

1. Verify vercel.json cron configuration
2. Check Vercel Dashboard → Project → Settings → Cron Jobs
3. Ensure `CRON_SECRET` matches in code and requests
4. Check Vercel logs for cron execution attempts

### Duplicates appearing

1. Check Redis connection:
   - Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Test Redis connection with `curl` command

2. Check hash function:
   - Verify customer fields are normalized properly
   - Look for inconsistent data (extra spaces, special chars)

### Scraping fails

1. Check Odoo page structure:
   - Visit https://www.odoo.com/de_DE/customers manually
   - Verify page structure hasn't changed
   - Update selectors in [cheerio-scraper.ts](lib/scraper/cheerio-scraper.ts) if needed

2. Check rate limiting:
   - Verify delays between requests
   - Look for 429 (Too Many Requests) errors in logs

## Development

### Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

### Test Endpoints

```bash
# Initialize sheets
curl http://localhost:3000/api/setup/init-sheets

# Test worker
curl -X POST http://localhost:3000/api/scrape/worker \
  -H "Content-Type: application/json" \
  -d '{"target":"uk","country":"United Kingdom","countryId":222,"page":1,"timestamp":1234567890}'

# Test cron (requires CRON_SECRET)
curl http://localhost:3000/api/cron/check-customers \
  -H "Authorization: Bearer your-cron-secret"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
