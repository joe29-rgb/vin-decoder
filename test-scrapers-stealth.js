/**
 * TEST SCRAPERS WITH STEALTH MODE
 * Uses puppeteer-extra with stealth plugin to bypass bot detection
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function testAutoTraderStealth() {
  console.log('\n=== TESTING AUTOTRADER.CA WITH STEALTH ===\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    const url = 'https://www.autotrader.ca/cars/?rcp=100&rcs=0&srt=35&prx=-1&hprc=True&wcp=True&sts=New-Used';
    
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    console.log('Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Save HTML
    const html = await page.content();
    fs.writeFileSync('autotrader-stealth.html', html);
    console.log('✅ Saved HTML');
    
    // Check if blocked
    if (html.includes('captcha') || html.includes('blocked') || html.includes('DataDome')) {
      console.log('❌ Bot detection triggered');
      await page.screenshot({ path: 'autotrader-blocked.png', fullPage: true });
      return false;
    }
    
    // Try multiple selector patterns
    const selectorTests = [
      { name: 'result-item', selector: 'div[class*="result-item"]' },
      { name: 'listing-item', selector: 'div[class*="listing"]' },
      { name: 'vehicle-card', selector: 'div[class*="vehicle"]' },
      { name: 'search-result', selector: 'div[class*="search-result"]' },
      { name: 'inventory-item', selector: 'div[class*="inventory"]' },
      { name: 'data-id', selector: '[data-id]' },
      { name: 'article', selector: 'article' }
    ];
    
    console.log('\nTesting selectors:');
    for (const test of selectorTests) {
      const count = await page.evaluate((sel) => {
        return document.querySelectorAll(sel).length;
      }, test.selector);
      
      if (count > 5) {
        console.log(`✅ ${test.name} (${test.selector}): ${count} elements`);
        
        // Get first element's classes
        const classes = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? el.className : null;
        }, test.selector);
        
        if (classes) {
          console.log(`   Classes: ${classes}`);
        }
      }
    }
    
    await page.screenshot({ path: 'autotrader-stealth.png', fullPage: true });
    console.log('✅ Screenshot saved');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function testCarGurusStealth() {
  console.log('\n=== TESTING CARGURUS.CA WITH STEALTH ===\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    const url = 'https://www.cargurus.ca/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&distance=100';
    
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    console.log('Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Save HTML
    const html = await page.content();
    fs.writeFileSync('cargurus-stealth.html', html);
    console.log('✅ Saved HTML');
    
    // Check if blocked
    if (html.includes('captcha') || html.includes('blocked') || html.includes('DataDome')) {
      console.log('❌ Bot detection triggered');
      await page.screenshot({ path: 'cargurus-blocked.png', fullPage: true });
      return false;
    }
    
    // Try multiple selector patterns
    const selectorTests = [
      { name: 'car-blade', selector: 'div[class*="carBlade"]' },
      { name: 'listing-row', selector: 'div[class*="listingRow"]' },
      { name: 'result-item', selector: 'div[class*="result"]' },
      { name: 'vehicle-card', selector: 'div[class*="vehicle"]' },
      { name: 'listing-card', selector: 'div[class*="listing"]' },
      { name: 'data-cg', selector: '[data-cg]' },
      { name: 'article', selector: 'article' }
    ];
    
    console.log('\nTesting selectors:');
    for (const test of selectorTests) {
      const count = await page.evaluate((sel) => {
        return document.querySelectorAll(sel).length;
      }, test.selector);
      
      if (count > 5) {
        console.log(`✅ ${test.name} (${test.selector}): ${count} elements`);
        
        // Get first element's classes
        const classes = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? el.className : null;
        }, test.selector);
        
        if (classes) {
          console.log(`   Classes: ${classes}`);
        }
      }
    }
    
    await page.screenshot({ path: 'cargurus-stealth.png', fullPage: true });
    console.log('✅ Screenshot saved');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🔍 STEALTH SCRAPER TEST\n');
  
  const autotraderSuccess = await testAutoTraderStealth();
  const cargurusSuccess = await testCarGurusStealth();
  
  console.log('\n=== RESULTS ===');
  console.log(`AutoTrader: ${autotraderSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`CarGurus: ${cargurusSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
}

main().catch(console.error);
