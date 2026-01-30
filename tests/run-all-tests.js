/**
 * MASTER TEST RUNNER
 * Runs all test suites in sequence
 */

const { spawn } = require('child_process');
const path = require('path');

const tests = [
  { name: 'Inventory Persistence', file: 'test-inventory.js' },
  { name: 'Approval Ingestion & Scoring', file: 'test-approvals.js' },
  { name: 'Scrapers', file: 'test-scrapers.js' },
  { name: 'Deal Worksheet', file: 'test-deal-worksheet.js' },
  { name: 'Integration (End-to-End)', file: 'test-integration.js' }
];

async function runTest(testFile) {
  return new Promise((resolve) => {
    const testPath = path.join(__dirname, testFile);
    const proc = spawn('node', [`"${testPath}"`], {
      stdio: 'inherit',
      shell: true,
      cwd: path.dirname(testPath)
    });
    
    proc.on('close', (code) => {
      resolve(code === 0);
    });
    
    proc.on('error', (error) => {
      console.error(`Error running ${testFile}:`, error);
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  MASTER TEST SUITE                         ║');
  console.log('║            Testing All Core Functionality                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const results = {};
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${test.name}`);
    console.log('='.repeat(60));
    
    const passed = await runTest(test.file);
    results[test.name] = passed;
    
    console.log(`\n${test.name}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  }
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL RESULTS                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status.padEnd(12)} ${name}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  const passedCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.values(results).length;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${passedCount}/${totalCount} test suites passed`);
  console.log('='.repeat(60));
  
  if (allPassed) {
    console.log('\n🎉 ALL TEST SUITES PASSED! 🎉');
    console.log('All core functionality is working correctly.\n');
  } else {
    console.log('\n⚠️  SOME TEST SUITES FAILED');
    console.log('Review the output above for details.\n');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error in test runner:', error);
  process.exit(1);
});
