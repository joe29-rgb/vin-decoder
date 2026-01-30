/**
 * COMPREHENSIVE TEST SCRIPT
 * Tests all critical fixes before deployment
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';
const DEALERSHIP_ID = '00000000-0000-0000-0000-000000000001';

async function testDealershipConfig() {
  console.log('\n=== TEST 1: Dealership Config Loading ===');
  try {
    const response = await axios.get(`${BASE_URL}/api/dealership/config`);
    console.log('✅ Config loaded:', {
      name: response.data.dealershipName,
      website: response.data.websiteUrl,
      usedPath: response.data.usedInventoryPath,
      newPath: response.data.newInventoryPath
    });
    
    if (!response.data.websiteUrl) {
      console.error('❌ FAIL: websiteUrl is missing');
      return false;
    }
    
    if (response.data.websiteUrl !== 'https://www.devonchrysler.com') {
      console.error('❌ FAIL: Wrong website URL:', response.data.websiteUrl);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.message);
    return false;
  }
}

async function testScraperUsed() {
  console.log('\n=== TEST 2: Scraper - Used Vehicles ===');
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 200,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    console.log('✅ Used vehicles scraped:', response.data.total);
    console.log('Sample vehicle:', response.data.vehicles[0]);
    
    // Devon Chrysler may have pagination issues - verify we got vehicles and they're deduplicated
    if (response.data.vehicles.length < 20) {
      console.log('❌ FAIL: Expected at least 20 used vehicles, got', response.data.vehicles.length);
      return false;
    }
    
    // Check for duplicates by VIN
    const vins = response.data.vehicles.filter(v => v.vin).map(v => v.vin);
    const uniqueVins = new Set(vins);
    if (vins.length !== uniqueVins.size) {
      console.log('❌ FAIL: Found duplicate vehicles (VINs)');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testScraperNew() {
  console.log('\n=== TEST 3: Scraper - New Vehicles ===');
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 200,
        path: '/search/new-chrysler-dodge-jeep-ram-devon-ab/?cy=t9g_1b2&tp=new'
      }
    });
    
    console.log('✅ New vehicles scraped:', response.data.total);
    
    if (response.data.total < 85) {
      console.error(`❌ FAIL: Expected ~88 new vehicles, got ${response.data.total}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testInventoryPersistence() {
  console.log('\n=== TEST 4: Inventory Persistence ===');
  try {
    // Get current inventory
    const response = await axios.get(`${BASE_URL}/api/inventory`);
    console.log('✅ Inventory loaded from Supabase:', response.data.length, 'vehicles');
    
    if (response.data.length === 0) {
      console.warn('⚠️ WARNING: No inventory in database yet');
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.message);
    return false;
  }
}

async function testPaymentCalculation() {
  console.log('\n=== TEST 5: Payment Calculation ===');
  try {
    // First, scrape some inventory
    console.log('Scraping inventory for calculation test...');
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    // Enrich the inventory
    console.log('Enriching inventory...');
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 10) // Just use first 10 for speed
    });
    
    // Test approval scoring
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
    
    console.log('✅ Scored vehicles:', response.data.inventoryCount);
    console.log('Top 3 deals:');
    response.data.rows.slice(0, 3).forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.title} - Sale: $${row.salePrice}, Payment: $${row.monthlyPayment}, Gross: $${row.totalGross}`);
    });
    
    // Check if all vehicles are priced at $14,000 (the bug)
    const allSamePrice = response.data.rows.every(r => r.salePrice === 14000);
    if (allSamePrice && response.data.rows.length > 1) {
      console.error('❌ FAIL: All vehicles priced at $14,000 - calculation bug still exists!');
      return false;
    }
    
    // Check if prices vary reasonably
    const prices = response.data.rows.map(r => r.salePrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    console.log(`Price range: $${minPrice} - $${maxPrice}`);
    
    if (maxPrice - minPrice < 5000 && response.data.rows.length > 10) {
      console.error('❌ FAIL: Price variation too small, calculation may be wrong');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive test suite...\n');
  console.log('Make sure the server is running on http://localhost:10000\n');
  
  const results = {
    dealershipConfig: await testDealershipConfig(),
    scraperUsed: await testScraperUsed(),
    scraperNew: await testScraperNew(),
    inventoryPersistence: await testInventoryPersistence(),
    paymentCalculation: await testPaymentCalculation()
  };
  
  console.log('\n=== TEST RESULTS ===');
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
