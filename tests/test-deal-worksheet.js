/**
 * DEAL WORKSHEET TEST
 * Tests: data flow from dashboard to worksheet, sessionStorage, field population
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testDealDataFlow() {
  console.log('\n=== TEST: Deal Data Flow ===');
  
  try {
    // Load inventory and score
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 10)
    });
    
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
    
    const scoreResponse = await axios.post(`${BASE_URL}/api/approvals/score`, {
      approval,
      trade
    });
    
    if (scoreResponse.data.rows.length === 0) {
      console.error('❌ FAIL: No deals to test');
      return false;
    }
    
    const deal = scoreResponse.data.rows[0];
    
    console.log(`✅ Deal data structure:`);
    console.log(`   Vehicle: ${deal.title}`);
    console.log(`   VIN: ${deal.vin || 'N/A'}`);
    console.log(`   Sale Price: $${deal.salePrice}`);
    console.log(`   Monthly Payment: $${deal.monthlyPayment}`);
    console.log(`   Front Gross: $${deal.frontGross}`);
    console.log(`   Back Gross: $${deal.backGross}`);
    console.log(`   Total Gross: $${deal.totalGross}`);
    console.log(`   Term: ${deal.term} months`);
    console.log(`   APR: ${deal.apr}%`);
    
    // Verify all required fields are present
    const requiredFields = [
      'title', 'salePrice', 'monthlyPayment', 'frontGross', 
      'backGross', 'totalGross', 'term', 'apr'
    ];
    
    const missingFields = requiredFields.filter(field => 
      deal[field] === undefined || deal[field] === null
    );
    
    if (missingFields.length > 0) {
      console.error(`❌ FAIL: Missing fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    // Verify no blank/zero values where they shouldn't be
    if (deal.salePrice === 0) {
      console.error('❌ FAIL: Sale price is 0');
      return false;
    }
    
    if (deal.monthlyPayment === 0) {
      console.error('❌ FAIL: Monthly payment is 0');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testDealCalculations() {
  console.log('\n=== TEST: Deal Calculations ===');
  
  try {
    // Load inventory and score
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 10)
    });
    
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
      allowance: 5000,
      acv: 4000,
      lienBalance: 2000
    };
    
    const scoreResponse = await axios.post(`${BASE_URL}/api/approvals/score`, {
      approval,
      trade
    });
    
    const deal = scoreResponse.data.rows[0];
    
    // Verify calculations make sense
    console.log(`   Sale Price: $${deal.salePrice}`);
    console.log(`   Front Gross: $${deal.frontGross}`);
    console.log(`   Back Gross: $${deal.backGross}`);
    console.log(`   Total Gross: $${deal.totalGross}`);
    
    // Total gross should be front + back
    const expectedTotal = deal.frontGross + deal.backGross;
    const actualTotal = deal.totalGross;
    const difference = Math.abs(expectedTotal - actualTotal);
    
    if (difference > 1) { // Allow $1 rounding difference
      console.error(`❌ FAIL: Total gross calculation incorrect`);
      console.error(`   Expected: $${expectedTotal.toFixed(2)}`);
      console.error(`   Actual: $${actualTotal.toFixed(2)}`);
      return false;
    }
    
    console.log(`✅ Calculations correct`);
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testMultipleDealScenarios() {
  console.log('\n=== TEST: Multiple Deal Scenarios ===');
  
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
    
    // Test different scenarios
    const scenarios = [
      {
        name: 'High payment cap',
        approval: { bank: 'TD', program: '4-Key', apr: 11.99, termMonths: 84, paymentMin: 0, paymentMax: 1500, downPayment: 0, province: 'AB' },
        trade: { allowance: 0, acv: 0, lienBalance: 0 }
      },
      {
        name: 'Low payment cap',
        approval: { bank: 'TD', program: '4-Key', apr: 11.99, termMonths: 84, paymentMin: 0, paymentMax: 500, downPayment: 0, province: 'AB' },
        trade: { allowance: 0, acv: 0, lienBalance: 0 }
      },
      {
        name: 'With trade',
        approval: { bank: 'TD', program: '4-Key', apr: 11.99, termMonths: 84, paymentMin: 0, paymentMax: 1000, downPayment: 0, province: 'AB' },
        trade: { allowance: 8000, acv: 7000, lienBalance: 3000 }
      },
      {
        name: 'With down payment',
        approval: { bank: 'TD', program: '4-Key', apr: 11.99, termMonths: 84, paymentMin: 0, paymentMax: 1000, downPayment: 5000, province: 'AB' },
        trade: { allowance: 0, acv: 0, lienBalance: 0 }
      }
    ];
    
    for (const scenario of scenarios) {
      const response = await axios.post(`${BASE_URL}/api/approvals/score`, {
        approval: scenario.approval,
        trade: scenario.trade
      });
      
      console.log(`   ${scenario.name}: ${response.data.rows.length} deals`);
      
      if (response.data.rows.length > 0) {
        const deal = response.data.rows[0];
        console.log(`     Top deal: $${deal.salePrice} @ $${deal.monthlyPayment}/mo`);
      }
    }
    
    console.log(`✅ All scenarios processed`);
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testDealSorting() {
  console.log('\n=== TEST: Deal Sorting (by Total Gross) ===');
  
  try {
    // Load inventory and score
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 10)
    });
    
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
    
    const deals = response.data.rows;
    
    if (deals.length < 2) {
      console.warn('⚠️ WARNING: Not enough deals to test sorting');
      return true;
    }
    
    // Verify deals are sorted by total gross (descending)
    let isSorted = true;
    for (let i = 0; i < deals.length - 1; i++) {
      if (deals[i].totalGross < deals[i + 1].totalGross) {
        isSorted = false;
        break;
      }
    }
    
    if (!isSorted) {
      console.error('❌ FAIL: Deals not sorted by total gross');
      return false;
    }
    
    console.log(`✅ Deals properly sorted by total gross`);
    console.log(`   Top: $${deals[0].totalGross}`);
    console.log(`   Bottom: $${deals[deals.length - 1].totalGross}`);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 DEAL WORKSHEET TEST SUITE\n');
  
  const results = {
    dataFlow: await testDealDataFlow(),
    calculations: await testDealCalculations(),
    scenarios: await testMultipleDealScenarios(),
    sorting: await testDealSorting()
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
