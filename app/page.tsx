export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Odoo Customer Tracking Bot</h1>
      <p>Automated tracking of new companies from Odoo customer pages.</p>

      <h2>Status</h2>
      <p>✅ System is operational</p>

      <h2>Tracking Targets</h2>
      <ul>
        <li><strong>All Customers</strong> - All companies across all industries and countries</li>
        <li><strong>DACH</strong> - Companies from Germany, Austria, and Switzerland</li>
        <li><strong>UK</strong> - Companies from the United Kingdom</li>
      </ul>

      <h2>Schedule</h2>
      <p>Automated checks run daily at 2:00 AM UTC</p>

      <h2>API Endpoints</h2>
      <ul>
        <li><code>/api/setup/init-sheets</code> - Initialize Google Sheets</li>
        <li><code>/api/cron/check-customers</code> - Trigger customer check (requires auth)</li>
        <li><code>/api/scrape/worker</code> - Worker endpoint (internal use)</li>
      </ul>

      <h2>Google Sheet</h2>
      <p>
        <a
          href="https://docs.google.com/spreadsheets/d/12ANpkqMGXtnT9jtx5xFRWT7Ycdm7Yh2jxNlzBE2Op-o/edit"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0070f3' }}
        >
          View Tracked Customers →
        </a>
      </p>
    </main>
  )
}
