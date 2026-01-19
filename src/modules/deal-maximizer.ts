/**
 * MODULE 6: DEAL MAXIMIZER ALGORITHM (CORE ENGINE)
 * Scans inventory, applies filters, calculates compliance, ranks by gross profit
 */

import { Deal, Vehicle, FindDealsRequest, LenderType, ProductBundle } from '../types/types';
import { calculateMonthlyPayment } from './payment-calculator';
import { calculateTradeInEquity } from './trade-in-equity';
import { validateCompliance } from './compliance-validator';
import { recommendBundles, validateProductFit } from './aftermarket-products';
import { getLenderProgram, getBaseReserve } from './lender-programs';

function generateDealId(): string {
  return `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function findOptimalDeals(
  request: FindDealsRequest,
  inventory: Vehicle[]
): Deal[] {
  const deals: Deal[] = [];
  const program = getLenderProgram(request.lender, request.tier);

  if (!program) {
    throw new Error(`Invalid lender/tier: ${request.lender}/${request.tier}`);
  }

  let filtered = inventory.filter(v => v.inStock);
  if (request.inventoryFilter?.make) {
    filtered = filtered.filter(v => v.make.toLowerCase().includes(request.inventoryFilter!.make!.toLowerCase()));
  }
  if (request.inventoryFilter?.maxMileage) {
    filtered = filtered.filter(v => v.mileage <= request.inventoryFilter!.maxMileage!);
  }

  for (const vehicle of filtered) {
    const vehicleDeals = processVehicle(
      vehicle,
      request,
      program
    );
    deals.push(...vehicleDeals);
  }

  const compliantDeals = deals.filter(d => d.compliance.overall);
  compliantDeals.sort((a, b) => b.grossProfit.total - a.grossProfit.total);

  return compliantDeals.slice(0, 10).map((deal, idx) => ({
    ...deal,
    rank: idx + 1,
  }));
}

function processVehicle(
  vehicle: Vehicle,
  request: FindDealsRequest,
  program: any
): Deal[] {
  const deals: Deal[] = [];

  const tradeEquity = request.tradeInValue
    ? calculateTradeInEquity(request.tradeInValue, request.tradeInBalance || 0, request.lender, request.tier)
    : { type: 'zero' as const, equityAmount: 0, canRollover: false, rolledAmount: 0 };

  let baseFinance = vehicle.suggestedPrice - request.downPayment - (tradeEquity.type === 'positive' ? tradeEquity.equityAmount : 0);
  if (tradeEquity.canRollover) {
    baseFinance += tradeEquity.rolledAmount;
  }
  baseFinance += program.fee;

  const bundles = recommendBundles(vehicle.blackBookValue, request.lender);

  for (const bundle of bundles) {
    const productFit = validateProductFit(bundle, vehicle.blackBookValue, request.lender);
    if (!productFit.fits) continue;

    const financeAmount = baseFinance + bundle.totalRetail;

    const paymentCalc = calculateMonthlyPayment(financeAmount, program.rate, request.term);

    const compliance = validateCompliance(
      paymentCalc.monthlyPayment,
      request.monthlyIncome,
      financeAmount,
      vehicle.blackBookValue,
      request.lender,
      request.tier
    );

    const vehicleGross = vehicle.suggestedPrice - vehicle.yourCost;
    const lenderReserve = getBaseReserve(program);
    const rateUpsell = (financeAmount * (program.rateUpsell || 0)) / 100;

    const deal: Deal = {
      id: generateDealId(),
      rank: 0,
      vehicle,
      lender: request.lender,
      tier: request.tier,
      salePrice: vehicle.suggestedPrice,
      downPayment: request.downPayment,
      financeAmount,
      monthlyPayment: paymentCalc.monthlyPayment,
      term: request.term,
      compliance,
      productBundle: bundle,
      grossProfit: {
        vehicleGross,
        lenderReserve,
        rateUpsell,
        productMargin: bundle.totalMargin,
        total: vehicleGross + lenderReserve + rateUpsell + bundle.totalMargin,
      },
      dealertrackCopy: generateDealertrackCopy(vehicle, paymentCalc.monthlyPayment, financeAmount, program),
    };

    deals.push(deal);
  }

  return deals;
}

function generateDealertrackCopy(vehicle: Vehicle, payment: number, finance: number, program: any): string {
  return `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
Stock: ${vehicle.id}
VIN: ${vehicle.vin}
Price: $${vehicle.suggestedPrice.toLocaleString()}
Finance: $${finance.toLocaleString()}
Payment: $${payment}/month
Rate: ${program.rate}%
Lender: ${program.lender}`;
}
