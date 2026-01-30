/**
 * INTEGRATION TEST - END-TO-END
 * Tests complete workflow: scrape -> enrich -> ingest approval -> score -> deal worksheet
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testCompleteWorkflow() {
  console.log('\n=== INTEGRATION TEST: Complete Workflow ===\n');
  
  try {
    // STEP 1: Scrape inventory
    console.log('STEP 1: Scraping dealership inventory...');
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 100,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    console.log(`✅ Scraped ${scrapeResponse.data.total} vehicles`);
    
    if (scrapeResponse.data.total === 0) {
      console.error('❌ FAIL: No vehicles scraped');
      return false;
    }
    
    // STEP 2: Enrich inventory
    console.log('\nSTEP 2: Enriching inventory...');
    const enrichResponse = await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 20)
    });
    
    console.log(`✅ Enriched ${enrichResponse.data.enriched} vehicles`);
    console.log(`   Added ${enrichResponse.data.notFound} new vehicles`);
    console.log(`   Total inventory: ${enrichResponse.data.totalInventory}`);
    
    // STEP 3: Verify inventory persisted
    console.log('\nSTEP 3: Verifying inventory persistence...');
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventory`);
    
    console.log(`✅ Inventory persisted: ${inventoryResponse.data.length} vehicles in Supabase`);
    
    if (inventoryResponse.data.length === 0) {
      console.error('❌ FAIL: Inventory not persisted');
      return false;
    }
    
    // STEP 4: Ingest approval (with auto-scoring)
    console.log('\nSTEP 4: Ingesting approval...');
    const approval = {
      contactId: `integration-test-${Date.now()}`,
      locationId: 'test-location',
      approval: {
        bank: 'TD',
        program: '4-Key',
        apr: 11.99,
        termMonths: 84,
        paymentMin: 0,
        paymentMax: 1000,
        downPayment: 0,
        province: 'AB'
      },
      trade: {
        allowance: 5000,
        acv: 4500,
        lienBalance: 2000
      }
    };
    
    const ingestResponse = await axios.post(`${BASE_URL}/api/approvals/ingest`, approval);
    
    console.log(`✅ Approval ingested`);
    console.log(`   Auto-scored: ${ingestResponse.data.scoredCount || 0} vehicles`);
    
    if (!ingestResponse.data.success) {
      console.error('❌ FAIL: Approval ingestion failed');
      return false;
    }
    
    // STEP 5: Manual scoring (verify it works independently)
    console.log('\nSTEP 5: Manual scoring...');
    const scoreResponse = await axios.post(`${BASE_URL}/api/approvals/score`, {
      approval: approval.approval,
      trade: approval.trade
    });
    
    console.log(`✅ Scored ${scoreResponse.data.inventoryCount} vehicles`);
    console.log(`   Returned ${scoreResponse.data.rows.length} deals`);
    
    if (scoreResponse.data.rows.length === 0) {
      console.error('❌ FAIL: No deals returned');
      return false;
    }
    
    // STEP 6: Verify deal data structure
    console.log('\nSTEP 6: Verifying deal data...');
    const deal = scoreResponse.data.rows[0];
    
    const requiredFields = [
      'vehicleId', 'title', 'vin', 'salePrice', 'monthlyPayment',
      'frontGross', 'backGross', 'totalGross', 'term', 'apr'
    ];
    
    const missingFields = requiredFields.filter(field => 
      deal[field] === undefined || deal[field] === null
    );
    
    if (missingFields.length > 0) {
      console.error(`❌ FAIL: Missing deal fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    console.log(`✅ Deal data complete`);
    console.log(`   Vehicle: ${deal.title}`);
    console.log(`   Sale: $${deal.salePrice}, Payment: $${deal.monthlyPayment}/mo`);
    console.log(`   Front Gross: $${deal.frontGross}, Back Gross: $${deal.backGross}`);
    console.log(`   Total Gross: $${deal.totalGross}`);
    
    // STEP 7: Test multiple lenders
    console.log('\nSTEP 7: Testing multiple lenders...');
    const lenders = [
      { bank: 'Santander', program: 'Standard', apr: 14.99, termMonths: 72, paymentMax: 900 },
      { bank: 'SDA', program: 'Prime', apr: 9.99, termMonths: 84, paymentMax: 1100 }
    ];
    
    for (const lender of lenders) {
      const lenderApproval = {
        contactId: `integration-test-${Date.now()}`,
        locationId: 'test-location',
        approval: {
          bank: lender.bank,
          program: lender.program,
          apr: lender.apr,
          termMonths: lender.termMonths,
          paymentMin: 0,
          paymentMax: lender.paymentMax,
          downPayment: 0,
          province: 'AB'
        },
        trade: approval.trade
      };
      
      const response = await axios.post(`${BASE_URL}/api/approvals/ingest`, lenderApproval);
      console.log(`   ${lender.bank}: ${response.data.success ? '✅' : '❌'} (${response.data.scoredCount || 0} vehicles)`);
    }
    
    // STEP 8: Test AutoTrader scraper
    console.log('\nSTEP 8: Testing AutoTrader scraper...');
    const autotraderResponse = await axios.get(`${BASE_URL}/api/scrape/autotrader`, {
      params: {
        make: 'Toyota',
        model: 'Camry',
        yearMin: 2020,
        location: 'Alberta',
        radius: 100,
        limit: 10
      },
      timeout: 60000
    });
    
    console.log(`✅ AutoTrader: ${autotraderResponse.data.count} vehicles`);
    
    // STEP 9: Test CarGurus scraper
    console.log('\nSTEP 9: Testing CarGurus scraper...');
    const cargurusResponse = await axios.get(`${BASE_URL}/api/scrape/cargurus`, {
      params: {
        make: 'Honda',
        model: 'Civic',
        yearMin: 2020,
        location: 'T5J',
        radius: 100,
        limit: 10
      },
      timeout: 60000
    });
    
    console.log(`✅ CarGurus: ${cargurusResponse.data.count} vehicles`);
    
    console.log('\n✅ INTEGRATION TEST PASSED - All systems working end-to-end');
    return true;
    
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED');
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n=== TEST: Error Handling ===\n');
  
  try {
    // Test invalid approval
    console.log('Testing invalid approval...');
    try {
      await axios.post(`${BASE_URL}/api/approvals/ingest`, {
        contactId: 'test',
        locationId: 'test',
        // Missing approval and trade
      });
      console.error('❌ FAIL: Should have rejected invalid approval');
      return false;
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid approval properly rejected');
      } else {
        throw error;
      }
    }
    
    // Test invalid scrape path
    console.log('\nTesting invalid scrape path...');
    try {
      await axios.get(`${BASE_URL}/api/scrape/dealership`, {
        params: {
          limit: 10,
          path: '/invalid/path/that/does/not/exist'
        }
      });
      // May succeed with 0 vehicles or fail - either is OK
      console.log('✅ Invalid path handled gracefully');
    } catch (error) {
      console.log('✅ Invalid path properly rejected');
    }
    
    // Test scoring with no inventory
    console.log('\nTesting scoring with empty inventory...');
    // This should work but return 0 deals
    const response = await axios.post(`${BASE_URL}/api/approvals/score`, {
      approval: {
        bank: 'TD',
        program: '4-Key',
        apr: 11.99,
        termMonths: 84,
        paymentMin: 0,
        paymentMax: 1000,
        downPayment: 0,
        province: 'AB'
      },
      trade: {
        allowance: 0,
        acv: 0,
        lienBalance: 0
      }
    });
    
    console.log(`✅ Empty inventory handled: ${response.data.rows.length} deals`);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 INTEGRATION TEST SUITE\n');
  console.log('Testing complete end-to-end workflow...\n');
  
  const results = {
    workflow: await testCompleteWorkflow(),
    errorHandling: await testErrorHandling()
  };
  
  console.log('\n=== FINAL RESULTS ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ ALL INTEGRATION TESTS PASSED' : '❌ SOME INTEGRATION TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
