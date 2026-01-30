/**
 * TEST DIRECT HTTP SCRAPING
 * Try scraping with axios + realistic headers instead of Puppeteer
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function testAutoTraderDirect() {
  console.log('\n=== TESTING AUTOTRADER.CA DIRECT HTTP ===\n');
  
  try {
    const url = 'https://www.autotrader.ca/cars/?rcp=100&rcs=0&srt=35&prx=-1&hprc=True&wcp=True&sts=New-Used';
    
    console.log('Fetching:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000
    });
    
    const html = response.data;
    fs.writeFileSync('autotrader-direct.html', html);
    console.log('✅ Saved HTML');
    
    // Check if blocked
    if (html.includes('captcha') || html.includes('blocked') || html.includes('DataDome') || html.includes('challenge')) {
      console.log('❌ Bot detection triggered');
      return false;
    }
    
    // Parse with cheerio
    const $ = cheerio.load(html);
    
    // Try various selectors
    const tests = [
      { name: 'result-item', selector: 'div[class*="result-item"]' },
      { name: 'listing', selector: 'div[class*="listing"]' },
      { name: 'vehicle', selector: 'div[class*="vehicle"]' },
      { name: 'search-result', selector: 'div[class*="search-result"]' },
      { name: 'data-id', selector: '[data-id]' },
      { name: 'article', selector: 'article' }
    ];
    
    console.log('\nTesting selectors:');
    for (const test of tests) {
      const count = $(test.selector).length;
      if (count > 5) {
        console.log(`✅ ${test.name} (${test.selector}): ${count} elements`);
        
        // Get first element's classes
        const firstEl = $(test.selector).first();
        if (firstEl.length) {
          console.log(`   Classes: ${firstEl.attr('class')}`);
        }
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testCarGurusDirect() {
  console.log('\n=== TESTING CARGURUS.CA DIRECT HTTP ===\n');
  
  try {
    const url = 'https://www.cargurus.ca/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&distance=100';
    
    console.log('Fetching:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000
    });
    
    const html = response.data;
    fs.writeFileSync('cargurus-direct.html', html);
    console.log('✅ Saved HTML');
    
    // Check if blocked
    if (html.includes('captcha') || html.includes('blocked') || html.includes('DataDome') || html.includes('challenge')) {
      console.log('❌ Bot detection triggered');
      return false;
    }
    
    // Parse with cheerio
    const $ = cheerio.load(html);
    
    // Try various selectors
    const tests = [
      { name: 'car-blade', selector: 'div[class*="carBlade"]' },
      { name: 'listing-row', selector: 'div[class*="listingRow"]' },
      { name: 'result', selector: 'div[class*="result"]' },
      { name: 'vehicle', selector: 'div[class*="vehicle"]' },
      { name: 'listing', selector: 'div[class*="listing"]' },
      { name: 'data-cg', selector: '[data-cg]' },
      { name: 'article', selector: 'article' }
    ];
    
    console.log('\nTesting selectors:');
    for (const test of tests) {
      const count = $(test.selector).length;
      if (count > 5) {
        console.log(`✅ ${test.name} (${test.selector}): ${count} elements`);
        
        // Get first element's classes
        const firstEl = $(test.selector).first();
        if (firstEl.length) {
          console.log(`   Classes: ${firstEl.attr('class')}`);
        }
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 DIRECT HTTP SCRAPING TEST\n');
  
  const autotraderSuccess = await testAutoTraderDirect();
  const cargurusSuccess = await testCarGurusDirect();
  
  console.log('\n=== RESULTS ===');
  console.log(`AutoTrader: ${autotraderSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`CarGurus: ${cargurusSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
}

main().catch(console.error);
