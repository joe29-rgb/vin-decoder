/**
 * INVENTORY PERSISTENCE TEST
 * Tests: upload, fetch, enrich, Supabase persistence
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';

async function testInventoryUpload() {
  console.log('\n=== TEST: Inventory Upload (via Enrich) ===');
  
  try {
    const testVehicles = [
      {
        id: 'TEST-001',
        vin: '1HGBH41JXMN109186',
        year: 2021,
        make: 'Honda',
        model: 'Accord',
        trim: 'Sport',
        mileage: 45000,
        color: 'Silver',
        engine: '1.5L Turbo',
        transmission: 'CVT',
        blackBookValue: 28000,
        yourCost: 24000,
        suggestedPrice: 29995,
        inStock: true,
        imageUrl: 'https://example.com/honda.jpg',
        imageUrls: ['https://example.com/honda1.jpg', 'https://example.com/honda2.jpg']
      },
      {
        id: 'TEST-002',
        vin: '5YFBURHE5HP123456',
        year: 2022,
        make: 'Toyota',
        model: 'Corolla',
        trim: 'LE',
        mileage: 32000,
        color: 'Blue',
        engine: '2.0L',
        transmission: 'CVT',
        blackBookValue: 24000,
        yourCost: 20000,
        suggestedPrice: 25995,
        inStock: true,
        imageUrl: 'https://example.com/toyota.jpg',
        imageUrls: ['https://example.com/toyota1.jpg']
      }
    ];
    
    const response = await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: testVehicles
    });
    
    console.log(`✅ Added ${response.data.notFound} vehicles`);
    console.log(`   Total inventory: ${response.data.totalInventory}`);
    
    if (response.data.notFound !== testVehicles.length) {
      console.error('❌ FAIL: Not all vehicles added');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testInventoryFetch() {
  console.log('\n=== TEST: Inventory Fetch ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory`);
    const vehicles = response.data.vehicles || response.data || [];
    
    console.log(`✅ Fetched ${vehicles.length} vehicles from Supabase`);
    
    if (vehicles.length === 0) {
      console.warn('⚠️ WARNING: No inventory in database');
    }
    
    // Verify data structure
    if (vehicles.length > 0) {
      const vehicle = vehicles[0];
      const requiredFields = ['id', 'year', 'make', 'model', 'suggestedPrice'];
      const missingFields = requiredFields.filter(field => !vehicle[field]);
      
      if (missingFields.length > 0) {
        console.error(`❌ FAIL: Missing fields: ${missingFields.join(', ')}`);
        return false;
      }
      
      console.log(`   Sample: ${vehicle.year} ${vehicle.make} ${vehicle.model} - $${vehicle.suggestedPrice}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testInventoryEnrich() {
  console.log('\n=== TEST: Inventory Enrichment ===');
  
  try {
    // First scrape some vehicles
    const scrapeResponse = await axios.get(`${BASE_URL}/api/scrape/dealership`, {
      params: {
        limit: 10,
        path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used'
      }
    });
    
    console.log(`   Scraped ${scrapeResponse.data.total} vehicles`);
    
    // Enrich them
    const enrichResponse = await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: scrapeResponse.data.vehicles.slice(0, 5)
    });
    
    console.log(`✅ Enriched ${enrichResponse.data.enriched} vehicles`);
    console.log(`   Added ${enrichResponse.data.notFound} new vehicles`);
    console.log(`   Total inventory: ${enrichResponse.data.totalInventory}`);
    
    if (enrichResponse.data.enriched === 0 && enrichResponse.data.notFound === 0) {
      console.error('❌ FAIL: No vehicles enriched or added');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testInventoryPersistence() {
  console.log('\n=== TEST: Inventory Persistence (Supabase) ===');
  
  try {
    // Add test vehicle
    const testVehicle = {
      id: `PERSIST-${Date.now()}`,
      vin: '1HGCM82633A123456',
      year: 2023,
      make: 'Honda',
      model: 'Civic',
      trim: 'EX',
      mileage: 15000,
      color: 'Red',
      engine: '2.0L',
      transmission: 'CVT',
      blackBookValue: 26000,
      yourCost: 22000,
      suggestedPrice: 27995,
      inStock: true,
      imageUrl: '',
      imageUrls: []
    };
    
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: [testVehicle]
    });
    
    console.log('   Uploaded test vehicle');
    
    // Wait a moment for Supabase to sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch and verify it persisted
    const response = await axios.get(`${BASE_URL}/api/inventory`);
    const vehicles = response.data.vehicles || response.data || [];
    const found = vehicles.find(v => v.id === testVehicle.id);
    
    if (!found) {
      console.error('❌ FAIL: Vehicle not found in Supabase');
      return false;
    }
    
    console.log(`✅ Vehicle persisted to Supabase`);
    console.log(`   ID: ${found.id}`);
    console.log(`   VIN: ${found.vin}`);
    console.log(`   Vehicle: ${found.year} ${found.make} ${found.model}`);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function testInventoryDeduplication() {
  console.log('\n=== TEST: Inventory Deduplication ===');
  
  try {
    const duplicateVehicle = {
      id: 'DUP-TEST',
      vin: '1HGCM82633A999999',
      year: 2023,
      make: 'Honda',
      model: 'Civic',
      trim: 'EX',
      mileage: 15000,
      color: 'Red',
      engine: '2.0L',
      transmission: 'CVT',
      blackBookValue: 26000,
      yourCost: 22000,
      suggestedPrice: 27995,
      inStock: true,
      imageUrl: '',
      imageUrls: []
    };
    
    // Add same vehicle twice
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: [duplicateVehicle]
    });
    
    const response1 = await axios.get(`${BASE_URL}/api/inventory`);
    const vehicles1 = response1.data.vehicles || response1.data || [];
    const count1 = vehicles1.filter(v => v.vin === duplicateVehicle.vin).length;
    
    await axios.post(`${BASE_URL}/api/inventory/enrich`, {
      vehicles: [duplicateVehicle]
    });
    
    const response2 = await axios.get(`${BASE_URL}/api/inventory`);
    const vehicles2 = response2.data.vehicles || response2.data || [];
    const count2 = vehicles2.filter(v => v.vin === duplicateVehicle.vin).length;
    
    if (count2 > count1) {
      console.error('❌ FAIL: Duplicate vehicle was added');
      return false;
    }
    
    console.log(`✅ Deduplication working - vehicle not duplicated`);
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 INVENTORY PERSISTENCE TEST SUITE\n');
  
  const results = {
    upload: await testInventoryUpload(),
    fetch: await testInventoryFetch(),
    enrich: await testInventoryEnrich(),
    persistence: await testInventoryPersistence(),
    deduplication: await testInventoryDeduplication()
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
