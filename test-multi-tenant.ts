/**
 * Multi-Tenant Isolation Test Script
 * 
 * This script tests that data is completely isolated between dealerships.
 * It creates two test dealerships and verifies they cannot access each other's data.
 */

import { getSupabase } from './src/modules/supabase';
import { getOrCreateDealership, storeDealershipTokens } from './src/modules/multi-tenant';
import { createDealershipToken } from './src/api/middleware/dealership-context';
import { saveInventoryToSupabase, fetchInventoryFromSupabase } from './src/modules/supabase';
import { saveApprovalToSupabase, getApprovalsFromSupabase } from './src/modules/approvals-storage';
import { saveDealToSupabase, getDealsFromSupabase } from './src/modules/deals-storage';
import { Vehicle } from './src/types/types';

// Test configuration
const TEST_DEALERSHIP_A = {
  locationId: 'test-location-aaa-' + Date.now(),
  companyId: 'test-company-aaa',
  name: 'Test Dealership A',
};

const TEST_DEALERSHIP_B = {
  locationId: 'test-location-bbb-' + Date.now(),
  companyId: 'test-company-bbb',
  name: 'Test Dealership B',
};

// Test data
const INVENTORY_A: Vehicle[] = [
  {
    id: 'TEST-A-001',
    vin: '1HGCM82633A123456',
    year: 2023,
    make: 'Honda',
    model: 'Accord',
    trim: 'EX-L',
    mileage: 15000,
    engine: '2.0L Turbo',
    transmission: 'Automatic',
    yourCost: 25000,
    suggestedPrice: 28000,
    blackBookValue: 26500,
    inStock: true,
  },
  {
    id: 'TEST-A-002',
    vin: '2HGCM82633A789012',
    year: 2022,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    mileage: 22000,
    engine: '2.5L 4-Cylinder',
    transmission: 'Automatic',
    yourCost: 23000,
    suggestedPrice: 26000,
    blackBookValue: 24500,
    inStock: true,
  },
];

const INVENTORY_B: Vehicle[] = [
  {
    id: 'TEST-B-001',
    vin: '3HGCM82633A345678',
    year: 2024,
    make: 'Ford',
    model: 'F-150',
    trim: 'Lariat',
    mileage: 5000,
    engine: '3.5L V6 EcoBoost',
    transmission: 'Automatic',
    yourCost: 45000,
    suggestedPrice: 52000,
    blackBookValue: 48000,
    inStock: true,
  },
  {
    id: 'TEST-B-002',
    vin: '4HGCM82633A901234',
    year: 2023,
    make: 'Chevrolet',
    model: 'Silverado',
    trim: 'LTZ',
    mileage: 12000,
    engine: '5.3L V8',
    transmission: 'Automatic',
    yourCost: 42000,
    suggestedPrice: 48000,
    blackBookValue: 45000,
    inStock: true,
  },
];

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
}

async function runTests() {
  console.log('\n🧪 Starting Multi-Tenant Isolation Tests\n');
  console.log('='.repeat(60));

  let dealershipA: any = null;
  let dealershipB: any = null;
  let tokenA: string = '';
  let tokenB: string = '';

  try {
    // ========================================================================
    // TEST 1: Create Dealership A
    // ========================================================================
    console.log('\n📋 Test 1: Create Dealership A');
    dealershipA = await getOrCreateDealership(
      TEST_DEALERSHIP_A.locationId,
      TEST_DEALERSHIP_A.companyId
    );

    if (dealershipA && dealershipA.id) {
      logTest(
        'Create Dealership A',
        true,
        `Created dealership with ID: ${dealershipA.id}`,
        { dealershipId: dealershipA.id, locationId: dealershipA.ghl_location_id }
      );

      // Update name
      const sb = getSupabase();
      if (sb) {
        await sb
          .from('dealerships')
          .update({ name: TEST_DEALERSHIP_A.name })
          .eq('id', dealershipA.id);
      }

      // Create JWT token
      tokenA = createDealershipToken({
        dealershipId: dealershipA.id,
        locationId: dealershipA.ghl_location_id,
        companyId: dealershipA.ghl_company_id,
      });
    } else {
      logTest('Create Dealership A', false, 'Failed to create dealership');
      return;
    }

    // ========================================================================
    // TEST 2: Create Dealership B
    // ========================================================================
    console.log('\n📋 Test 2: Create Dealership B');
    dealershipB = await getOrCreateDealership(
      TEST_DEALERSHIP_B.locationId,
      TEST_DEALERSHIP_B.companyId
    );

    if (dealershipB && dealershipB.id) {
      logTest(
        'Create Dealership B',
        true,
        `Created dealership with ID: ${dealershipB.id}`,
        { dealershipId: dealershipB.id, locationId: dealershipB.ghl_location_id }
      );

      // Update name
      const sb = getSupabase();
      if (sb) {
        await sb
          .from('dealerships')
          .update({ name: TEST_DEALERSHIP_B.name })
          .eq('id', dealershipB.id);
      }

      // Create JWT token
      tokenB = createDealershipToken({
        dealershipId: dealershipB.id,
        locationId: dealershipB.ghl_location_id,
        companyId: dealershipB.ghl_company_id,
      });
    } else {
      logTest('Create Dealership B', false, 'Failed to create dealership');
      return;
    }

    // ========================================================================
    // TEST 3: Upload Inventory for Dealership A
    // ========================================================================
    console.log('\n📋 Test 3: Upload Inventory for Dealership A');
    
    // Use direct insert instead of upsert to avoid constraint issues
    const sb = getSupabase();
    if (sb) {
      const rowsA = INVENTORY_A.map(v => ({
        dealership_id: dealershipA.id,
        vin: v.vin,
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        mileage: v.mileage,
        engine: v.engine,
        transmission: v.transmission,
        your_cost: v.yourCost,
        suggested_price: v.suggestedPrice,
        black_book_value: v.blackBookValue,
        in_stock: v.inStock,
      }));
      await sb.from('vehicles').insert(rowsA);
    }
    
    const inventoryA = await fetchInventoryFromSupabase(dealershipA.id);

    if (inventoryA && inventoryA.length === 2) {
      logTest(
        'Upload Inventory A',
        true,
        `Uploaded ${inventoryA.length} vehicles for Dealership A`,
        { vehicleIds: inventoryA.map(v => v.id) }
      );
    } else {
      logTest(
        'Upload Inventory A',
        false,
        `Expected 2 vehicles, got ${inventoryA?.length || 0}`
      );
    }

    // ========================================================================
    // TEST 4: Upload Inventory for Dealership B
    // ========================================================================
    console.log('\n📋 Test 4: Upload Inventory for Dealership B');
    
    // Use direct insert instead of upsert to avoid constraint issues
    if (sb) {
      const rowsB = INVENTORY_B.map(v => ({
        dealership_id: dealershipB.id,
        vin: v.vin,
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        mileage: v.mileage,
        engine: v.engine,
        transmission: v.transmission,
        your_cost: v.yourCost,
        suggested_price: v.suggestedPrice,
        black_book_value: v.blackBookValue,
        in_stock: v.inStock,
      }));
      await sb.from('vehicles').insert(rowsB);
    }
    
    const inventoryB = await fetchInventoryFromSupabase(dealershipB.id);

    if (inventoryB && inventoryB.length === 2) {
      logTest(
        'Upload Inventory B',
        true,
        `Uploaded ${inventoryB.length} vehicles for Dealership B`,
        { vehicleIds: inventoryB.map(v => v.id) }
      );
    } else {
      logTest(
        'Upload Inventory B',
        false,
        `Expected 2 vehicles, got ${inventoryB?.length || 0}`
      );
    }

    // ========================================================================
    // TEST 5: Verify Inventory Isolation
    // ========================================================================
    console.log('\n📋 Test 5: Verify Inventory Isolation');
    
    // Dealership A should only see their 2 vehicles (with VINs starting with 1 or 2)
    const inventoryACheck = await fetchInventoryFromSupabase(dealershipA.id);
    const aVins = inventoryACheck?.map(v => v.vin) || [];
    const hasOnlyAVehicles = inventoryACheck?.length === 2 && 
      aVins.every(vin => vin?.startsWith('1') || vin?.startsWith('2'));

    if (hasOnlyAVehicles) {
      logTest(
        'Inventory Isolation A',
        true,
        'Dealership A can only see their own vehicles',
        { count: inventoryACheck.length, vins: aVins }
      );
    } else {
      logTest(
        'Inventory Isolation A',
        false,
        'Dealership A can see other dealership vehicles!',
        { count: inventoryACheck?.length, vins: aVins }
      );
    }

    // Dealership B should only see their 2 vehicles (with VINs starting with 3 or 4)
    const inventoryBCheck = await fetchInventoryFromSupabase(dealershipB.id);
    const bVins = inventoryBCheck?.map(v => v.vin) || [];
    const hasOnlyBVehicles = inventoryBCheck?.length === 2 && 
      bVins.every(vin => vin?.startsWith('3') || vin?.startsWith('4'));

    if (hasOnlyBVehicles) {
      logTest(
        'Inventory Isolation B',
        true,
        'Dealership B can only see their own vehicles',
        { count: inventoryBCheck.length, vins: bVins }
      );
    } else {
      logTest(
        'Inventory Isolation B',
        false,
        'Dealership B can see other dealership vehicles!',
        { count: inventoryBCheck?.length, vins: bVins }
      );
    }

    // ========================================================================
    // TEST 6: Create Approval for Dealership A
    // ========================================================================
    console.log('\n📋 Test 6: Create Approval for Dealership A');
    const approvalA = await saveApprovalToSupabase(
      dealershipA.id,
      'contact-a-001',
      TEST_DEALERSHIP_A.locationId,
      {
        bank: 'TD',
        program: '5 Key',
        apr: 5.99,
        termMonths: 60,
        paymentMin: 0,
        paymentMax: 500,
        downPayment: 2000,
      },
      {
        allowance: 8000,
        acv: 7500,
        lienBalance: 5000,
      }
    );

    if (approvalA) {
      logTest(
        'Create Approval A',
        true,
        'Created approval for Dealership A',
        { approvalId: approvalA.id }
      );
    } else {
      logTest('Create Approval A', false, 'Failed to create approval');
    }

    // ========================================================================
    // TEST 7: Create Approval for Dealership B
    // ========================================================================
    console.log('\n📋 Test 7: Create Approval for Dealership B');
    const approvalB = await saveApprovalToSupabase(
      dealershipB.id,
      'contact-b-001',
      TEST_DEALERSHIP_B.locationId,
      {
        bank: 'Santander',
        program: 'Tier 3',
        apr: 8.99,
        termMonths: 72,
        paymentMin: 0,
        paymentMax: 700,
        downPayment: 5000,
      },
      {
        allowance: 12000,
        acv: 11000,
        lienBalance: 8000,
      }
    );

    if (approvalB) {
      logTest(
        'Create Approval B',
        true,
        'Created approval for Dealership B',
        { approvalId: approvalB.id }
      );
    } else {
      logTest('Create Approval B', false, 'Failed to create approval');
    }

    // ========================================================================
    // TEST 8: Verify Approval Isolation
    // ========================================================================
    console.log('\n📋 Test 8: Verify Approval Isolation');
    
    const approvalsA = await getApprovalsFromSupabase(dealershipA.id);
    const approvalsB = await getApprovalsFromSupabase(dealershipB.id);

    if (approvalsA.length === 1 && approvalsA[0].contact_id === 'contact-a-001') {
      logTest(
        'Approval Isolation A',
        true,
        'Dealership A can only see their own approval',
        { count: approvalsA.length, contactId: approvalsA[0].contact_id }
      );
    } else {
      logTest(
        'Approval Isolation A',
        false,
        'Dealership A approval isolation failed',
        { count: approvalsA.length }
      );
    }

    if (approvalsB.length === 1 && approvalsB[0].contact_id === 'contact-b-001') {
      logTest(
        'Approval Isolation B',
        true,
        'Dealership B can only see their own approval',
        { count: approvalsB.length, contactId: approvalsB[0].contact_id }
      );
    } else {
      logTest(
        'Approval Isolation B',
        false,
        'Dealership B approval isolation failed',
        { count: approvalsB.length }
      );
    }

    // ========================================================================
    // TEST 9: Create Deal for Dealership A
    // ========================================================================
    console.log('\n📋 Test 9: Create Deal for Dealership A');
    const dealA = await saveDealToSupabase(dealershipA.id, {
      sale_price: 28000,
      monthly_payment: 450,
      front_gross: 3000,
      back_gross: 1500,
      product_margin: 0,
      total_gross: 4500,
      lender: 'TD',
      tier: '5 Key',
      term: 60,
      apr: 5.99,
      ltv: 85,
      dsr: 35,
      status: 'pending',
    });

    if (dealA) {
      logTest(
        'Create Deal A',
        true,
        'Created deal for Dealership A',
        { dealId: dealA.id }
      );
    } else {
      logTest('Create Deal A', false, 'Failed to create deal');
    }

    // ========================================================================
    // TEST 10: Create Deal for Dealership B
    // ========================================================================
    console.log('\n📋 Test 10: Create Deal for Dealership B');
    const dealB = await saveDealToSupabase(dealershipB.id, {
      sale_price: 52000,
      monthly_payment: 650,
      front_gross: 7000,
      back_gross: 2000,
      product_margin: 0,
      total_gross: 9000,
      lender: 'Santander',
      tier: 'Tier 3',
      term: 72,
      apr: 8.99,
      ltv: 90,
      dsr: 40,
      status: 'pending',
    });

    if (dealB) {
      logTest(
        'Create Deal B',
        true,
        'Created deal for Dealership B',
        { dealId: dealB.id }
      );
    } else {
      logTest('Create Deal B', false, 'Failed to create deal');
    }

    // ========================================================================
    // TEST 11: Verify Deal Isolation
    // ========================================================================
    console.log('\n📋 Test 11: Verify Deal Isolation');
    
    const dealsA = await getDealsFromSupabase(dealershipA.id);
    const dealsB = await getDealsFromSupabase(dealershipB.id);

    if (dealsA.length === 1 && dealsA[0].sale_price === 28000) {
      logTest(
        'Deal Isolation A',
        true,
        'Dealership A can only see their own deal',
        { count: dealsA.length, salePrice: dealsA[0].sale_price, lender: dealsA[0].lender }
      );
    } else {
      logTest(
        'Deal Isolation A',
        false,
        'Dealership A deal isolation failed',
        { count: dealsA.length }
      );
    }

    if (dealsB.length === 1 && dealsB[0].sale_price === 52000) {
      logTest(
        'Deal Isolation B',
        true,
        'Dealership B can only see their own deal',
        { count: dealsB.length, salePrice: dealsB[0].sale_price, lender: dealsB[0].lender }
      );
    } else {
      logTest(
        'Deal Isolation B',
        false,
        'Dealership B deal isolation failed',
        { count: dealsB.length }
      );
    }

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    logTest('Test Suite', false, `Error: ${(error as Error).message}`);
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const sb = getSupabase();
    if (sb && dealershipA && dealershipB) {
      // Delete test vehicles
      await sb.from('vehicles').delete().eq('dealership_id', dealershipA.id);
      await sb.from('vehicles').delete().eq('dealership_id', dealershipB.id);
      
      // Delete test approvals
      await sb.from('approvals').delete().eq('dealership_id', dealershipA.id);
      await sb.from('approvals').delete().eq('dealership_id', dealershipB.id);
      
      // Delete test deals
      await sb.from('deals').delete().eq('dealership_id', dealershipA.id);
      await sb.from('deals').delete().eq('dealership_id', dealershipB.id);
      
      // Delete test dealerships
      await sb.from('dealerships').delete().eq('id', dealershipA.id);
      await sb.from('dealerships').delete().eq('id', dealershipB.id);
      
      console.log('✅ Cleanup complete');
    }
  } catch (error) {
    console.error('⚠️  Cleanup failed:', error);
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Pass Rate: ${passRate}%`);

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Multi-tenant isolation is working correctly.');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Please review the results above.');
  }
  
  console.log('='.repeat(60) + '\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
