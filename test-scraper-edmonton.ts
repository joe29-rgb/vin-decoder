/**
 * Test Script: Competitor Scraper for Edmonton, Alberta
 * 
 * This script tests the free Puppeteer/Cheerio scraper to find vehicles
 * within 100km of Edmonton, Alberta on AutoTrader.ca and CarGurus.ca
 */

import { FreeVehicleScraper } from './src/modules/scrapers/free-scraper';

async function testEdmontonScraper() {
  console.log('🚀 Starting Edmonton Competitor Scraper Test');
  console.log('📍 Location: Edmonton, Alberta');
  console.log('📏 Radius: 100km');
  console.log('─'.repeat(60));

  const scraper = new FreeVehicleScraper();

  try {
    // Test AutoTrader.ca scraper
    console.log('\n🔍 Testing AutoTrader.ca...');
    console.log('─'.repeat(60));
    
    const autoTraderParams = {
      location: 'Edmonton',
      province: 'AB',
      postalCode: 'T5J',
      radiusKm: 100,
      limit: 20, // Limit to 20 vehicles for testing
    };

    const autoTraderStart = Date.now();
    const autoTraderResults = await scraper.scrapeAutoTrader(autoTraderParams);
    const autoTraderDuration = ((Date.now() - autoTraderStart) / 1000).toFixed(2);

    console.log(`\n✅ AutoTrader.ca Results:`);
    console.log(`   • Found: ${autoTraderResults.length} vehicles`);
    console.log(`   • Duration: ${autoTraderDuration}s`);
    
    if (autoTraderResults.length > 0) {
      console.log(`\n📋 Sample Listings (first 5):`);
      autoTraderResults.slice(0, 5).forEach((vehicle, index) => {
        console.log(`\n   ${index + 1}. ${vehicle.title}`);
        console.log(`      💰 Price: ${vehicle.price}`);
        console.log(`      📍 Location: ${vehicle.location}`);
        console.log(`      🏢 Dealer: ${vehicle.dealerName}`);
        console.log(`      🔗 URL: ${vehicle.url}`);
        if (vehicle.vin) console.log(`      🔢 VIN: ${vehicle.vin}`);
        if (vehicle.mileage) console.log(`      🛣️  Mileage: ${vehicle.mileage}`);
      });
    }

    // Test CarGurus.ca scraper
    console.log('\n\n🔍 Testing CarGurus.ca...');
    console.log('─'.repeat(60));
    
    const carGurusParams = {
      location: 'Edmonton',
      province: 'AB',
      postalCode: 'T5J',
      radiusKm: 100,
      limit: 20, // Limit to 20 vehicles for testing
    };

    const carGurusStart = Date.now();
    const carGurusResults = await scraper.scrapeCarGurus(carGurusParams);
    const carGurusDuration = ((Date.now() - carGurusStart) / 1000).toFixed(2);

    console.log(`\n✅ CarGurus.ca Results:`);
    console.log(`   • Found: ${carGurusResults.length} vehicles`);
    console.log(`   • Duration: ${carGurusDuration}s`);
    
    if (carGurusResults.length > 0) {
      console.log(`\n📋 Sample Listings (first 5):`);
      carGurusResults.slice(0, 5).forEach((vehicle, index) => {
        console.log(`\n   ${index + 1}. ${vehicle.title}`);
        console.log(`      💰 Price: ${vehicle.price}`);
        console.log(`      📍 Location: ${vehicle.location}`);
        console.log(`      🏢 Dealer: ${vehicle.dealerName}`);
        console.log(`      🔗 URL: ${vehicle.url}`);
        if (vehicle.vin) console.log(`      🔢 VIN: ${vehicle.vin}`);
        if (vehicle.mileage) console.log(`      🛣️  Mileage: ${vehicle.mileage}`);
      });
    }

    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('─'.repeat(60));
    console.log(`AutoTrader.ca:  ${autoTraderResults.length} vehicles in ${autoTraderDuration}s`);
    console.log(`CarGurus.ca:    ${carGurusResults.length} vehicles in ${carGurusDuration}s`);
    console.log(`Total:          ${autoTraderResults.length + carGurusResults.length} vehicles`);
    console.log(`Total Duration: ${(parseFloat(autoTraderDuration) + parseFloat(carGurusDuration)).toFixed(2)}s`);

    // Close browser
    await scraper.closeBrowser();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Error during scraper test:', error);
    await scraper.closeBrowser();
    process.exit(1);
  }
}

// Run the test
testEdmontonScraper()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
