/**
 * Push test data to Google Sheets to demonstrate the format
 * Run with: npx tsx scripts/push-test-data.ts
 */

import { appendCustomersToSheet } from '../lib/google-sheets/writer';
import { Customer } from '../types/customer';

async function pushTestData() {
  console.log('📊 Pushing test data to Google Sheets...\n');

  // Test customers for each target
  const testCustomers: Customer[] = [
    {
      name: '[TEST] Example Company GmbH',
      industry: 'IT / Kommunikation / Marketing',
      country: 'Deutschland',
      description: 'This is a test entry to demonstrate the data format in Google Sheets.',
      detailUrl: 'https://www.odoo.com/de_DE/customers/example-company-123',
      detectedDate: new Date().toISOString()
    },
    {
      name: '[TEST] Sample Business Ltd',
      industry: 'Großhandel / Einzelhandel',
      country: 'United Kingdom',
      description: 'Another test entry showing how customer data appears in the spreadsheet.',
      detailUrl: 'https://www.odoo.com/de_DE/customers/sample-business-456',
      detectedDate: new Date().toISOString()
    }
  ];

  try {
    // Push to "All" tab
    console.log('1️⃣ Adding test data to "All" tab...');
    await appendCustomersToSheet('all', testCustomers);
    console.log('   ✅ Done!\n');

    // Push to "DACH" tab (German company)
    console.log('2️⃣ Adding test data to "DACH" tab...');
    await appendCustomersToSheet('dach', [testCustomers[0]]);
    console.log('   ✅ Done!\n');

    // Push to "UK" tab (UK company)
    console.log('3️⃣ Adding test data to "UK" tab...');
    await appendCustomersToSheet('uk', [testCustomers[1]]);
    console.log('   ✅ Done!\n');

    console.log('🎉 Test data successfully added to all tabs!');
    console.log('\n📋 View your Google Sheet:');
    console.log('https://docs.google.com/spreadsheets/d/12ANpkqMGXtnT9jtx5xFRWT7Ycdm7Yh2jxNlzBE2Op-o/edit');
    console.log('\n💡 You should see:');
    console.log('   - "All" tab: 2 test entries');
    console.log('   - "DACH" tab: 1 test entry (German company)');
    console.log('   - "UK" tab: 1 test entry (UK company)');
    console.log('\n⚠️  These are marked with [TEST] prefix - you can delete them later.');

  } catch (error) {
    console.error('❌ Error pushing test data:', error);
    process.exit(1);
  }
}

pushTestData();
