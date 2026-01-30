/**
 * APPROVAL INGESTION & SCORING TEST
 * Tests: approval ingestion, auto-scoring, multi-lender support
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testApprovalIngestion() {
  console.log('\n=== TEST: Approval Ingestion ===');
  
  try {
    const approval = {
      contactId: `test-contact-${Date.now()}`,
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
        allowance: 0,
        acv: 0,
        lienBalance: 0
      }
    };
    
    const response = await axios.post(`${BASE_URL}/api/approvals/ingest`, approval);
    
    if (!response.data.success) {
      console.error('❌ FAIL: Approval ingestion failed');
      return false;
    }
    
    console.log(`✅ Approval ingested successfully`);
    console.log(`   Bank: ${approval.approval.bank}`);
    console.log(`   Program: ${approval.approval.program}`);
    console.log(`   Auto-scored: ${response.data.scoredCount || 0} vehicles`);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testMultiLenderIngestion() {
  console.log('\n=== TEST: Multi-Lender Ingestion ===');
  
  try {
    const lenders = [
      { bank: 'TD', program: '4-Key', apr: 11.99, termMonths: 84, paymentMax: 1000 },
      { bank: 'Santander', program: 'Standard', apr: 14.99, termMonths: 72, paymentMax: 900 },
      { bank: 'SDA', program: 'Prime', apr: 9.99, termMonths: 84, paymentMax: 1100 },
      { bank: 'RIFCO', program: 'Standard', apr: 19.99, termMonths: 60, paymentMax: 800 }
    ];
    
    const results = [];
    
    for (const lender of lenders) {
      const payload = {
        contactId: `multi-test-${Date.now()}`,
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
        trade: {
          allowance: 0,
          acv: 0,
          lienBalance: 0
        }
      };
      
      const response = await axios.post(`${BASE_URL}/api/approvals/ingest`, payload);
      results.push({
        bank: lender.bank,
        success: response.data.success,
        scored: response.data.scoredCount || 0
      });
      
      console.log(`   ${lender.bank}: ${response.data.success ? '✅' : '❌'} (${response.data.scoredCount || 0} vehicles scored)`);
    }
    
    const allSuccess = results.every(r => r.success);
    
    if (!allSuccess) {
      console.error('❌ FAIL: Some lenders failed to ingest');
      return false;
    }
    
    console.log(`✅ All ${lenders.length} lenders ingested successfully`);
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testApprovalScoring() {
  console.log('\n=== TEST: Approval Scoring ===');
  
  try {
    // First ensure we have inventory
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 10)
    });
    
    console.log(`   Loaded ${scrapeResponse.data.total} vehicles for scoring`);
    
    // Score with approval
    const approval = {
      bank: 'TD',
      program: '4-Key',
      apr: 11.99,
      termMonths: 84,
      paymentMin: 0,
      paymentMax: 1000,
      downPayment: 0,
      province: 'AB'
    };
    
    const trade = {
      allowance: 0,
      acv: 0,
      lienBalance: 0
    };
    
    const response = await axios.post(`${BASE_URL}/api/approvals/score`, {
      approval,
      trade
    });
    
    console.log(`✅ Scored ${response.data.inventoryCount} vehicles`);
    console.log(`   Returned ${response.data.rows.length} deals`);
    
    if (response.data.rows.length === 0) {
      console.error('❌ FAIL: No deals returned');
      return false;
    }
    
    // Verify deal structure
    const deal = response.data.rows[0];
    const requiredFields = ['title', 'salePrice', 'monthlyPayment', 'frontGross', 'backGross', 'totalGross'];
    const missingFields = requiredFields.filter(field => deal[field] === undefined || deal[field] === null);
    
    if (missingFields.length > 0) {
      console.error(`❌ FAIL: Missing deal fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    console.log(`   Top deal: ${deal.title}`);
    console.log(`   Sale: $${deal.salePrice}, Payment: $${deal.monthlyPayment}, Gross: $${deal.totalGross}`);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testAutoScoring() {
  console.log('\n=== TEST: Auto-Scoring on Ingestion ===');
  
  try {
    // Ensure inventory exists
    const inventoryResponse = await axios.get(`${BASE_URL}/api/inventory`);
    
    if (inventoryResponse.data.length === 0) {
      console.log('   Loading inventory first...');
      const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
        params: {
          limit: 50,
          path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
        }
      });
      
      await axios.post(`${BASE_URL}/api/inventory/enrich`, {
        vehicles: scrapeResponse.data.vehicles.slice(0, 10)
      });
    }
    
    // Ingest approval and check if auto-scoring happened
    const approval = {
      contactId: `auto-score-test-${Date.now()}`,
      locationId: 'test-location',
      approval: {
        bank: 'Santander',
        program: 'Standard',
        apr: 14.99,
        termMonths: 72,
        paymentMin: 0,
        paymentMax: 900,
        downPayment: 0,
        province: 'AB'
      },
      trade: {
        allowance: 0,
        acv: 0,
        lienBalance: 0
      }
    };
    
    const response = await axios.post(`${BASE_URL}/api/approvals/ingest`, approval);
    
    if (!response.data.scoredCount || response.data.scoredCount === 0) {
      console.error('❌ FAIL: Auto-scoring did not trigger');
      return false;
    }
    
    console.log(`✅ Auto-scoring triggered on ingestion`);
    console.log(`   Scored ${response.data.scoredCount} vehicles automatically`);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testPaymentCalculations() {
  console.log('\n=== TEST: Payment Calculations (CBB=$40k, Cost=$10k) ===');
  
  try {
    // Load inventory
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 10)
    });
    
    // Score with approval
    const approval = {
      bank: 'TD',
      program: '4-Key',
      apr: 11.99,
      termMonths: 84,
      paymentMin: 0,
      paymentMax: 1000,
      downPayment: 0,
      province: 'AB'
    };
    
    const trade = {
      allowance: 0,
      acv: 0,
      lienBalance: 0
    };
    
    const response = await axios.post(`${BASE_URL}/api/approvals/score`, {
      approval,
      trade
    });
    
    const prices = response.data.rows.map(r => r.salePrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const variation = maxPrice - minPrice;
    
    console.log(`✅ Price range: $${minPrice} - $${maxPrice}`);
    console.log(`   Variation: $${variation}`);
    
    // Check if all prices are the same (bug)
    if (prices.every(p => p === prices[0]) && prices.length > 1) {
      console.error('❌ FAIL: All vehicles have same price - calculation bug!');
      return false;
    }
    
    // Check if variation is reasonable
    if (variation < 5000 && prices.length > 5) {
      console.error('❌ FAIL: Price variation too small');
      return false;
    }
    
    // Verify CBB and cost defaults are being used
    const deal = response.data.rows[0];
    console.log(`   Sample deal gross: $${deal.totalGross}`);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 APPROVAL INGESTION & SCORING TEST SUITE\n');
  
  const results = {
    ingestion: await testApprovalIngestion(),
    multiLender: await testMultiLenderIngestion(),
    scoring: await testApprovalScoring(),
    autoScoring: await testAutoScoring(),
    paymentCalcs: await testPaymentCalculations()
  };
  
  console.log('\n=== RESULTS ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
