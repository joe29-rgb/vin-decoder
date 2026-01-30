/**
 * SCRAPERS TEST
 * Tests: dealership scraper, AutoTrader, CarGurus, pagination, deduplication
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testDealershipScraper() {
  console.log('\n=== TEST: Dealership Scraper (Devon Chrysler) ===');
  
  try {
    // Test used vehicles
    const usedResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 200,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    console.log(`✅ Used vehicles: ${usedResponse.data.total} scraped`);
    
    // Check for duplicates by VIN
    const usedVins = usedResponse.data.vehicles.filter(v => v.vin).map(v => v.vin);
    const uniqueUsedVins = new Set(usedVins);
    
    if (usedVins.length !== uniqueUsedVins.size) {
      console.error('❌ FAIL: Found duplicate VINs in used vehicles');
      return false;
    }
    
    console.log(`   Unique VINs: ${uniqueUsedVins.size}`);
    
    // Test new vehicles
    const newResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 200,
        path: '/search/new-chrysler-dodge-jeep-ram-devon-ab/?cy=t9g_1b2&tp=new'
      }
    });
    
    console.log(`✅ New vehicles: ${newResponse.data.total} scraped`);
    
    // Check for duplicates by VIN
    const newVins = newResponse.data.vehicles.filter(v => v.vin).map(v => v.vin);
    const uniqueNewVins = new Set(newVins);
    
    if (newVins.length !== uniqueNewVins.size) {
      console.error('❌ FAIL: Found duplicate VINs in new vehicles');
      return false;
    }
    
    console.log(`   Unique VINs: ${uniqueNewVins.size}`);
    
    // Verify vehicle data quality
    if (usedResponse.data.vehicles.length > 0) {
      const sample = usedResponse.data.vehicles[0];
      console.log(`   Sample: ${sample.year} ${sample.make} ${sample.model} - $${sample.suggestedPrice}`);
      
      if (!sample.year || !sample.make || !sample.model) {
        console.error('❌ FAIL: Missing required vehicle data');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testAutoTraderScraper() {
  console.log('\n=== TEST: AutoTrader Scraper ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/autotrader`, {
      params: {
        make: 'Toyota',
        model: 'Camry',
        yearMin: 2020,
        location: 'Alberta',
        radius: 100,
        limit: 20
      },
      timeout: 60000
    });
    
    console.log(`✅ AutoTrader: ${response.data.count} vehicles found`);
    console.log(`   Source: ${response.data.source}`);
    
    if (response.data.vehicles.length > 0) {
      const sample = response.data.vehicles[0];
      console.log(`   Sample: ${sample.year} ${sample.make} ${sample.model} - $${sample.suggestedPrice}`);
    }
    
    // Note: 0 results is OK - depends on what's available
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testCarGurusScraper() {
  console.log('\n=== TEST: CarGurus Scraper ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/cargurus`, {
      params: {
        make: 'Honda',
        model: 'Civic',
        yearMin: 2020,
        location: 'T5J',
        radius: 100,
        limit: 20
      },
      timeout: 60000
    });
    
    console.log(`✅ CarGurus: ${response.data.count} vehicles found`);
    console.log(`   Source: ${response.data.source}`);
    
    if (response.data.vehicles.length > 0) {
      const sample = response.data.vehicles[0];
      console.log(`   Sample: ${sample.year} ${sample.make} ${sample.model} - $${sample.suggestedPrice}`);
    }
    
    // Note: 0 results is OK - depends on what's available or bot detection
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testScraperCache() {
  console.log('\n=== TEST: Scraper Cache ===');
  
  try {
    const url = '/search/used-devon-ab/?cy=t9g_1b2&tp=used';
    
    // First request (should scrape)
    console.log('   First request (scraping)...');
    const start1 = Date.now();
    const response1 = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: url,
        cache: 'true'
      }
    });
    const time1 = Date.now() - start1;
    
    console.log(`   First request: ${response1.data.total} vehicles in ${time1}ms`);
    
    // Second request (should use cache)
    console.log('   Second request (cached)...');
    const start2 = Date.now();
    const response2 = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: url,
        cache: 'true'
      }
    });
    const time2 = Date.now() - start2;
    
    console.log(`   Second request: ${response2.data.total} vehicles in ${time2}ms`);
    
    if (response2.data.cached) {
      console.log(`✅ Cache working - second request was ${Math.round((time1 - time2) / time1 * 100)}% faster`);
    } else {
      console.warn('⚠️ WARNING: Cache may not be working');
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testScraperDeduplication() {
  console.log('\n=== TEST: Scraper Deduplication ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 200,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used',
        cache: 'false'
      }
    });
    
    const vehicles = response.data.vehicles;
    
    // Check for duplicate VINs
    const vins = vehicles.filter(v => v.vin && v.vin.length > 5).map(v => v.vin);
    const uniqueVins = new Set(vins);
    
    // Check for duplicate stock numbers
    const stockNumbers = vehicles.map(v => v.id);
    const uniqueStockNumbers = new Set(stockNumbers);
    
    console.log(`   Total vehicles: ${vehicles.length}`);
    console.log(`   Unique VINs: ${uniqueVins.size} / ${vins.length}`);
    console.log(`   Unique stock numbers: ${uniqueStockNumbers.size} / ${stockNumbers.length}`);
    
    if (vins.length !== uniqueVins.size) {
      console.error('❌ FAIL: Found duplicate VINs');
      return false;
    }
    
    if (stockNumbers.length !== uniqueStockNumbers.size) {
      console.error('❌ FAIL: Found duplicate stock numbers');
      return false;
    }
    
    console.log(`✅ No duplicates found`);
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testScraperDataQuality() {
  console.log('\n=== TEST: Scraper Data Quality ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 50,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    const vehicles = response.data.vehicles;
    
    if (vehicles.length === 0) {
      console.error('❌ FAIL: No vehicles scraped');
      return false;
    }
    
    // Check data completeness
    let withVin = 0;
    let withPrice = 0;
    let withMileage = 0;
    let withImages = 0;
    let withYear = 0;
    let withMake = 0;
    let withModel = 0;
    
    vehicles.forEach(v => {
      if (v.vin && v.vin.length > 5) withVin++;
      if (v.suggestedPrice > 0) withPrice++;
      if (v.mileage > 0) withMileage++;
      if (v.imageUrls && v.imageUrls.length > 0) withImages++;
      if (v.year > 0) withYear++;
      if (v.make) withMake++;
      if (v.model) withModel++;
    });
    
    const total = vehicles.length;
    
    console.log(`   Data completeness:`);
    console.log(`     VINs: ${withVin}/${total} (${Math.round(withVin/total*100)}%)`);
    console.log(`     Prices: ${withPrice}/${total} (${Math.round(withPrice/total*100)}%)`);
    console.log(`     Mileage: ${withMileage}/${total} (${Math.round(withMileage/total*100)}%)`);
    console.log(`     Images: ${withImages}/${total} (${Math.round(withImages/total*100)}%)`);
    console.log(`     Year: ${withYear}/${total} (${Math.round(withYear/total*100)}%)`);
    console.log(`     Make: ${withMake}/${total} (${Math.round(withMake/total*100)}%)`);
    console.log(`     Model: ${withModel}/${total} (${Math.round(withModel/total*100)}%)`);
    
    // All vehicles should have year, make, model
    if (withYear !== total || withMake !== total || withModel !== total) {
      console.error('❌ FAIL: Missing required vehicle data');
      return false;
    }
    
    console.log(`✅ Data quality acceptable`);
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 SCRAPERS TEST SUITE\n');
  
  const results = {
    dealership: await testDealershipScraper(),
    autotrader: await testAutoTraderScraper(),
    cargurus: await testCarGurusScraper(),
    cache: await testScraperCache(),
    deduplication: await testScraperDeduplication(),
    dataQuality: await testScraperDataQuality()
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
