/**
 * Test Script: API-based Scraper Test for Edmonton, Alberta
 * 
 * This script tests the scraper API endpoints to find vehicles
 * within 100km of Edmonton, Alberta
 */

import axios from 'axios';

const API_BASE = 'http://localhost:8080';

interface ScraperResponse {
  success: boolean;
  vehicles?: any[];
  total?: number;
  error?: string;
  message?: string;
}

async function testEdmontonScraperAPI() {
  console.log('🚀 Starting Edmonton Scraper API Test');
  console.log('📍 Location: Edmonton, Alberta');
  console.log('📏 Radius: 100km');
  console.log('🌐 API Base: ' + API_BASE);
  console.log('─'.repeat(60));

  try {
    // Test 1: AutoTrader.ca scraper
    console.log('\n🔍 Testing AutoTrader.ca API...');
    console.log('─'.repeat(60));
    
    const autoTraderStart = Date.now();
    const autoTraderResponse = await axios.get<ScraperResponse>(
      `${API_BASE}/api/scrape/autotrader`,
      {
        params: {
          location: 'Edmonton',
          province: 'AB',
          postalCode: 'T5J',
          radiusKm: 100,
          limit: 20
        },
        timeout: 120000 // 2 minute timeout
      }
    );
    const autoTraderDuration = ((Date.now() - autoTraderStart) / 1000).toFixed(2);

    if (autoTraderResponse.data.success) {
      const vehicles = autoTraderResponse.data.vehicles || [];
      console.log(`\n✅ AutoTrader.ca Results:`);
      console.log(`   • Found: ${vehicles.length} vehicles`);
      console.log(`   • Duration: ${autoTraderDuration}s`);
      
      if (vehicles.length > 0) {
        console.log(`\n📋 Sample Listings (first 3):`);
        vehicles.slice(0, 3).forEach((vehicle, index) => {
          console.log(`\n   ${index + 1}. ${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`);
          console.log(`      💰 Price: $${vehicle.suggestedPrice?.toLocaleString() || 'N/A'}`);
          console.log(`      🛣️  Mileage: ${vehicle.mileage?.toLocaleString() || 'N/A'} km`);
          console.log(`      🔢 VIN: ${vehicle.vin || 'N/A'}`);
        });
      }
    } else {
      console.log(`\n❌ AutoTrader.ca Failed:`);
      console.log(`   Error: ${autoTraderResponse.data.error || 'Unknown error'}`);
    }

    // Test 2: CarGurus.ca scraper
    console.log('\n\n🔍 Testing CarGurus.ca API...');
    console.log('─'.repeat(60));
    
    const carGurusStart = Date.now();
    const carGurusResponse = await axios.get<ScraperResponse>(
      `${API_BASE}/api/scrape/cargurus`,
      {
        params: {
          location: 'Edmonton',
          province: 'AB',
          postalCode: 'T5J',
          radiusKm: 100,
          limit: 20
        },
        timeout: 120000 // 2 minute timeout
      }
    );
    const carGurusDuration = ((Date.now() - carGurusStart) / 1000).toFixed(2);

    if (carGurusResponse.data.success) {
      const vehicles = carGurusResponse.data.vehicles || [];
      console.log(`\n✅ CarGurus.ca Results:`);
      console.log(`   • Found: ${vehicles.length} vehicles`);
      console.log(`   • Duration: ${carGurusDuration}s`);
      
      if (vehicles.length > 0) {
        console.log(`\n📋 Sample Listings (first 3):`);
        vehicles.slice(0, 3).forEach((vehicle, index) => {
          console.log(`\n   ${index + 1}. ${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`);
          console.log(`      💰 Price: $${vehicle.suggestedPrice?.toLocaleString() || 'N/A'}`);
          console.log(`      🛣️  Mileage: ${vehicle.mileage?.toLocaleString() || 'N/A'} km`);
          console.log(`      🔢 VIN: ${vehicle.vin || 'N/A'}`);
        });
      }
    } else {
      console.log(`\n❌ CarGurus.ca Failed:`);
      console.log(`   Error: ${carGurusResponse.data.error || 'Unknown error'}`);
    }

    // Summary
    const autoTraderCount = autoTraderResponse.data.vehicles?.length || 0;
    const carGurusCount = carGurusResponse.data.vehicles?.length || 0;
    
    console.log('\n\n📊 SUMMARY');
    console.log('─'.repeat(60));
    console.log(`AutoTrader.ca:  ${autoTraderCount} vehicles in ${autoTraderDuration}s`);
    console.log(`CarGurus.ca:    ${carGurusCount} vehicles in ${carGurusDuration}s`);
    console.log(`Total:          ${autoTraderCount + carGurusCount} vehicles`);
    
    console.log('\n✅ Test completed successfully!');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error during API test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Server not running! Start the server with: npm start');
    }
    process.exit(1);
  }
}

// Run the test
console.log('⏳ Waiting for server to be ready...\n');
setTimeout(() => {
  testEdmontonScraperAPI();
}, 2000);
