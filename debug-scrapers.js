/**
 * DEBUG SCRIPT - Inspect AutoTrader and CarGurus HTML structure
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugAutoTrader() {
  console.log('\n=== DEBUGGING AUTOTRADER.CA ===\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.autotrader.ca/cars/toyota/camry/?rcp=100&rcs=0&srt=35&yRng=2020%2C&prx=-1&hprc=True&wcp=True&sts=New-Used&inMarket=advancedSearch';
    
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Page loaded, waiting 5 seconds for dynamic content...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Save full HTML
    const html = await page.content();
    fs.writeFileSync('autotrader-debug.html', html);
    console.log('✅ Saved HTML to autotrader-debug.html');
    
    // Try to find vehicle cards with various selectors
    const selectors = [
      'div[class*="result"]',
      'div[class*="listing"]',
      'div[class*="vehicle"]',
      'div[class*="card"]',
      'article',
      '[data-id]',
      '[data-vehicle]',
      'div[id*="listing"]'
    ];
    
    console.log('\nTesting selectors:');
    for (const selector of selectors) {
      const count = await page.evaluate((sel) => {
        return document.querySelectorAll(sel).length;
      }, selector);
      
      if (count > 0) {
        console.log(`✅ ${selector}: ${count} elements found`);
        
        // Get sample HTML
        const sample = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? el.outerHTML.substring(0, 500) : null;
        }, selector);
        
        if (sample) {
          console.log(`   Sample: ${sample}...`);
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'autotrader-debug.png', fullPage: true });
    console.log('✅ Saved screenshot to autotrader-debug.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

async function debugCarGurus() {
  console.log('\n=== DEBUGGING CARGURUS.CA ===\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.cargurus.ca/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?zip=T5J&distance=100&minYear=2020&maxYear=2024';
    
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Page loaded, waiting 5 seconds for dynamic content...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Save full HTML
    const html = await page.content();
    fs.writeFileSync('cargurus-debug.html', html);
    console.log('✅ Saved HTML to cargurus-debug.html');
    
    // Try to find vehicle cards with various selectors
    const selectors = [
      'div[class*="result"]',
      'div[class*="listing"]',
      'div[class*="vehicle"]',
      'div[class*="card"]',
      'article',
      '[data-cg]',
      'div[id*="listing"]',
      'div[class*="CarCard"]'
    ];
    
    console.log('\nTesting selectors:');
    for (const selector of selectors) {
      const count = await page.evaluate((sel) => {
        return document.querySelectorAll(sel).length;
      }, selector);
      
      if (count > 0) {
        console.log(`✅ ${selector}: ${count} elements found`);
        
        // Get sample HTML
        const sample = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? el.outerHTML.substring(0, 500) : null;
        }, selector);
        
        if (sample) {
          console.log(`   Sample: ${sample}...`);
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'cargurus-debug.png', fullPage: true });
    console.log('✅ Saved screenshot to cargurus-debug.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🔍 SCRAPER DEBUG TOOL\n');
  console.log('This will open browsers and inspect the actual HTML structure\n');
  
  await debugAutoTrader();
  await debugCarGurus();
  
  console.log('\n✅ Debug complete! Check the generated files:');
  console.log('   - autotrader-debug.html');
  console.log('   - autotrader-debug.png');
  console.log('   - cargurus-debug.html');
  console.log('   - cargurus-debug.png');
}

main().catch(console.error);
