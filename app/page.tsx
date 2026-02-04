'use client';

import { useState } from 'react';
import HistoryIcon from '@/components/HistoryIcon';

export default function Home() {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with History Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Odoo Customer Tracking Bot</h1>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: 'transparent',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.borderColor = '#999';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#ddd';
          }}
          title="View History"
        >
          <HistoryIcon size={32} color="#666" strokeWidth={2} />
        </button>
      </div>

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
      <p>Automated checks run daily at <strong>4:00 AM CEST</strong> (2:00 AM UTC)</p>

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

      {/* History Panel */}
      {showHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '400px',
            height: '100vh',
            backgroundColor: 'white',
            boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '2rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Scraping History</h2>
            <button
              onClick={() => setShowHistory(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px'
              }}
            >
              ×
            </button>
          </div>

          <HistoryList />
        </div>
      )}

      {/* Overlay */}
      {showHistory && (
        <div
          onClick={() => setShowHistory(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 999
          }}
        />
      )}
    </main>
  );
}

function HistoryList() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch history on mount
  useState(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch history:', err);
        setLoading(false);
      });
  });

  if (loading) {
    return <p style={{ color: '#666' }}>Loading history...</p>;
  }

  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0', color: '#999' }}>
        <p>No scraping history yet.</p>
        <p style={{ fontSize: '14px' }}>History will appear here after the first automated run.</p>
      </div>
    );
  }

  return (
    <div>
      {history.map((entry, index) => (
        <div
          key={index}
          style={{
            padding: '1rem',
            borderBottom: '1px solid #eee',
            marginBottom: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem', color: entry.error ? '#dc2626' : 'inherit' }}>
                {entry.error ? '❌ ERROR' : entry.target.toUpperCase()}
              </strong>
              <span style={{ color: entry.error ? '#dc2626' : (entry.newCustomers > 0 ? '#0070f3' : '#666'), fontSize: '14px' }}>
                {entry.error
                  ? entry.error
                  : (entry.newCustomers > 0
                    ? `${entry.newCustomers} new customer${entry.newCustomers !== 1 ? 's' : ''} found`
                    : 'No new customers')}
              </span>
            </div>
            <time style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
              {formatTimeCEST(entry.timestamp)}
            </time>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimeCEST(timestamp: number): string {
  const date = new Date(timestamp);

  // Format in CEST (Central European Summer Time)
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
