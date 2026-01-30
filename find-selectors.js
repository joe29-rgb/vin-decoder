const fs = require('fs');
const cheerio = require('cheerio');

// Test AutoTrader
console.log('=== AUTOTRADER.CA ===\n');
const atHtml = fs.readFileSync('autotrader-direct.html', 'utf8');
const $at = cheerio.load(atHtml);

const atTests = [
  'div[class*="result"]',
  'div[id*="result"]',
  '[data-id]',
  'article',
  '.result-item',
  'div.listing',
  '[class*="listing"]',
  '[id*="listing"]'
];

console.log('Testing selectors:');
atTests.forEach(sel => {
  const count = $at(sel).length;
  if (count > 0) {
    console.log(`${sel}: ${count} elements`);
    const first = $at(sel).first();
    if (first.length) {
      const classes = first.attr('class') || '';
      const id = first.attr('id') || '';
      console.log(`  First element - class: "${classes.substring(0, 100)}", id: "${id}"`);
    }
  }
});

// Check if page has vehicle data in JSON
if (atHtml.includes('"adID"') || atHtml.includes('vehicles')) {
  console.log('\n✅ Page contains vehicle data in JSON/JavaScript');
}
