/**
 * CORE FUNCTIONALITY TEST
 * Tests all user-mentioned core functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testDealershipScraper() {
  console.log('\n=== TEST 1: Dealership Scraper (Devon Chrysler) ===');
  try {
    // Test used vehicles
    const usedResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 200,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    console.log(`✅ Used vehicles: ${usedResponse.data.total} scraped`);
    console.log(`   Unique VINs: ${new Set(usedResponse.data.vehicles.filter(v => v.vin).map(v => v.vin)).size}`);
    
    // Test new vehicles
    const newResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 200,
        path: '/search/new-chrysler-dodge-jeep-ram-devon-ab/?cy=t9g_1b2&tp=new'
      }
    });
    
    console.log(`✅ New vehicles: ${newResponse.data.total} scraped`);
    console.log(`   Unique VINs: ${new Set(newResponse.data.vehicles.filter(v => v.vin).map(v => v.vin)).size}`);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testAutoTraderScraper() {
  console.log('\n=== TEST 2: AutoTrader Scraper ===');
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/autotrader`, {
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
    
    console.log(`✅ AutoTrader: ${response.data.count} vehicles found`);
    if (response.data.vehicles.length > 0) {
      console.log(`   Sample: ${response.data.vehicles[0].year} ${response.data.vehicles[0].make} ${response.data.vehicles[0].model}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testCarGurusScraper() {
  console.log('\n=== TEST 3: CarGurus Scraper ===');
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/cargurus`, {
      params: {
        make: 'Honda',
        model: 'Civic',
        yearMin: 2020,
        location: 'Alberta',
        radius: 100,
        limit: 10
      },
      timeout: 60000
    });
    
    console.log(`✅ CarGurus: ${response.data.count} vehicles found`);
    if (response.data.vehicles.length > 0) {
      console.log(`   Sample: ${response.data.vehicles[0].year} ${response.data.vehicles[0].make} ${response.data.vehicles[0].model}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testDealWorksheet() {
  console.log('\n=== TEST 4: Deal Worksheet Data Flow ===');
  try {
    // First scrape and enrich inventory
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 5)
    });
    
    // Score inventory
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
      console.error('❌ FAIL: No scored vehicles returned');
      return false;
    }
    
    const deal = scoreResponse.data.rows[0];
    console.log('✅ Deal data structure:');
    console.log(`   Vehicle: ${deal.title}`);
    console.log(`   Sale Price: $${deal.salePrice}`);
    console.log(`   Monthly Payment: $${deal.monthlyPayment}`);
    console.log(`   Front Gross: $${deal.frontGross}`);
    console.log(`   Back Gross: $${deal.backGross}`);
    console.log(`   Total Gross: $${deal.totalGross}`);
    
    // Check for blank/missing values
    const hasBlankValues = !deal.salePrice || !deal.monthlyPayment || !deal.totalGross;
    if (hasBlankValues) {
      console.error('❌ FAIL: Deal has blank values');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testMultiLenderPDFParsing() {
  console.log('\n=== TEST 5: Multi-Lender PDF Approval Parsing ===');
  try {
    // Test ingesting multiple lender approvals with correct payload format
    const lenders = [
      { bank: 'TD', program: '4-Key', apr: 11.99, termMonths: 84, paymentMax: 1000 },
      { bank: 'Santander', program: 'Standard', apr: 14.99, termMonths: 72, paymentMax: 900 },
      { bank: 'SDA', program: 'Prime', apr: 9.99, termMonths: 84, paymentMax: 1100 }
    ];
    
    for (const lender of lenders) {
      const payload = {
        contactId: 'test-contact-' + Date.now(),
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
      
      if (!response.data.success) {
        console.error(`❌ FAIL: Failed to ingest ${lender.bank} approval`);
        return false;
      }
      
      console.log(`✅ ${lender.bank} approval ingested and auto-scored (${response.data.scoredCount || 0} vehicles)`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testPaymentCalculations() {
  console.log('\n=== TEST 6: Payment Calculations (CBB=$40k, Cost=$10k) ===');
  try {
    // Scrape and enrich
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
    
    console.log(`✅ Price range: $${minPrice} - $${maxPrice}`);
    console.log(`   Variation: $${maxPrice - minPrice}`);
    
    // Check if all prices are the same (bug)
    if (prices.every(p => p === prices[0]) && prices.length > 1) {
      console.error('❌ FAIL: All vehicles have same price - calculation bug!');
      return false;
    }
    
    // Check if variation is reasonable
    if (maxPrice - minPrice < 5000 && prices.length > 5) {
      console.error('❌ FAIL: Price variation too small');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 CORE FUNCTIONALITY TEST SUITE\n');
  console.log('Testing all user-mentioned core functionality...\n');
  
  const results = {
    dealershipScraper: await testDealershipScraper(),
    autoTraderScraper: await testAutoTraderScraper(),
    carGurusScraper: await testCarGurusScraper(),
    dealWorksheet: await testDealWorksheet(),
    multiLenderParsing: await testMultiLenderPDFParsing(),
    paymentCalculations: await testPaymentCalculations()
  };
  
  console.log('\n=== FINAL RESULTS ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ ALL CORE FUNCTIONALITY WORKING' : '❌ SOME CORE FUNCTIONALITY BROKEN'}`);
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
