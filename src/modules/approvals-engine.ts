import { Vehicle, ApprovalSpec, TradeInfo, ScoredVehicleRow, Province, BackCapRule } from '../types/types';
import { calculateTaxSavings } from './tax-calculator';
import { getPaymentSummary } from './payment-calculator';
import { findRule } from './rules-library';
import { getMaxTermForVehicle } from './vehicle-booking-guide';

const DEFAULT_FEE = 810;
const DEFAULT_PROVINCE: Province = 'AB';

function computeMonthlyPayment(
  salePrice: number,
  vehicle: Vehicle,
  approval: ApprovalSpec,
  trade: TradeInfo,
  termOverride?: number
): number {
  const province = approval.province || DEFAULT_PROVINCE;
  const down = approval.downPayment || 0;

  const equity = trade.allowance - trade.lienBalance; // negative means rolled in
  const tax = calculateTaxSavings(salePrice, trade.allowance, province, approval.isNativeStatus || false);
  const principal = salePrice - down - equity + DEFAULT_FEE + tax.totalTax;

  const { monthlyPayment } = getPaymentSummary(
    Math.max(0, principal),
    approval.apr,
    termOverride ?? approval.termMonths
  );
  return monthlyPayment;
}

function computePrincipal(
  salePrice: number,
  approval: ApprovalSpec,
  trade: TradeInfo,
  province: Province = DEFAULT_PROVINCE
): number {
  const down = approval.downPayment || 0;
  const equity = trade.allowance - trade.lienBalance; // negative means rolled in
  const tax = calculateTaxSavings(salePrice, trade.allowance, province, approval.isNativeStatus || false);
  const principal = salePrice - down - equity + DEFAULT_FEE + tax.totalTax;
  return Math.max(0, principal);
}

function calcGrossParts(
  salePrice: number,
  vehicle: Vehicle,
  approval: ApprovalSpec,
  trade: TradeInfo
): { front: number; back: number } {
  const overAllowance = Math.max(0, trade.allowance - trade.acv);
  const front = (salePrice - vehicle.yourCost) - overAllowance;

  let back = 0;
  if (approval.backCap) {
    const bb = vehicle.blackBookValue || 10000;
    if (approval.backCap.type === 'percent_of_bb') {
      back = approval.backCap.percent * bb;
    } else {
      back = approval.backCap.percent * salePrice;
    }
  }
  return { front, back };
}

function findMaxPriceWithinPayment(
  minPrice: number,
  maxPrice: number,
  vehicle: Vehicle,
  approval: ApprovalSpec,
  trade: TradeInfo,
  paymentMin: number,
  paymentMax: number,
  termMonthsEff: number
): { price: number; payment: number; fitsRange: boolean } {
  let lo = minPrice;
  let hi = maxPrice;
  let best = { price: minPrice, payment: computeMonthlyPayment(minPrice, vehicle, approval, trade, termMonthsEff), fitsRange: false };

  // if even minPrice exceeds paymentMax, search lower than minPrice is impossible -> no fit
  if (best.payment > paymentMax) {
    return best; // not in range
  }

  // Binary search highest price whose payment ≤ paymentMax
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const pay = computeMonthlyPayment(mid, vehicle, approval, trade, termMonthsEff);
    if (pay <= paymentMax) {
      best = { price: mid, payment: pay, fitsRange: pay >= paymentMin };
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

export function scoreInventory(
  inventory: Vehicle[],
  approval: ApprovalSpec,
  trade: TradeInfo
): ScoredVehicleRow[] {
  const rows: ScoredVehicleRow[] = [];

  for (const v of inventory) {
    try {
      const flags: string[] = [];
      
      // Set CBB (Canadian Black Book / Black Book) to $40,000 for all vehicles
      // This is used for front cap calculations in payment matrix
      let bb = v.blackBookValue || 0;
      if (bb <= 0 || isNaN(bb)) {
        bb = 40000; // Default CBB to $40,000
        flags.push('estimated_black_book');
      }
      
      // Set default cost to $10,000 if missing
      // Cost is used for gross profit calculations
      let cost = v.yourCost;
      if (cost == null || isNaN(cost) || cost <= 0) {
        cost = 10000; // Default cost to $10,000
        flags.push('estimated_cost');
      }

    // Load dynamic lender rule if available
    const rule = findRule(approval.bank, approval.program);
    
    // Get maximum term based on vehicle booking guide (year + mileage)
    const maxTermForVehicle = getMaxTermForVehicle(
      approval.bank,
      approval.program,
      v.year,
      v.mileage
    );
    
    // If vehicle is ineligible (returns 0), skip it
    if (maxTermForVehicle === 0) {
      flags.push('vehicle_ineligible_year_mileage');
      continue;
    }
    
    // Effective caps & constraints
    const frontCapFactorEff = approval.frontCapFactor ?? rule?.frontCapFactor;
    const backCapEff: BackCapRule | undefined = approval.backCap ?? rule?.backCap;

    // Use the lesser of approval term or vehicle's max eligible term
    const termMonthsEff = Math.min(approval.termMonths, maxTermForVehicle);

    // Payment call cap from lender rule (if lower than approval)
    const paymentMaxEff = Math.min(approval.paymentMax, rule?.maxPayCall ?? Number.POSITIVE_INFINITY);

    const frontCap = frontCapFactorEff != null ? bb * frontCapFactorEff : Number.POSITIVE_INFINITY;
    const minPrice = Math.max(cost, 0);
    const maxPrice = Math.max(minPrice, Math.min(frontCap, minPrice + 100000));

    const best = findMaxPriceWithinPayment(
      minPrice,
      maxPrice,
      v,
      approval,
      trade,
      approval.paymentMin,
      paymentMaxEff,
      termMonthsEff
    );

    // Front gross
    const overAllowance = Math.max(0, trade.allowance - trade.acv);
    const front = (best.price - cost) - overAllowance;

    // Compute amount financed (principal) for reserve calculations
    const province = approval.province || DEFAULT_PROVINCE;
    const principal = computePrincipal(best.price, approval, trade, province);

    // Reserve/bonus computation from rules
    let reserve = 0;
    if (rule?.reserve) {
      if (rule.reserve.percentOfFinanced) {
        reserve += rule.reserve.percentOfFinanced * principal;
      }
      if (Array.isArray(rule.reserve.fixedByFinancedAmount)) {
        const br = rule.reserve.fixedByFinancedAmount.find(b => principal >= b.minFinanced && principal <= b.maxFinanced);
        if (br) reserve += br.amount;
      }
      if (Array.isArray(rule.reserve.qualityBonusByFinancedAmount)) {
        const qb = rule.reserve.qualityBonusByFinancedAmount.find(b => principal >= b.minFinanced && principal <= b.maxFinanced);
        if (qb) reserve += qb.amount;
      }
    }

    // Apply back-end cap if present
    if (backCapEff) {
      let capAmt = 0;
      if (backCapEff.type === 'percent_of_bb') capAmt = backCapEff.percent * (bb ?? 0);
      else capAmt = backCapEff.percent * best.price;
      reserve = Math.min(reserve, capAmt);
    }

    const back = Math.max(0, Math.round(reserve));
    const totalGross = Math.max(0, Math.round((front + back) * 100) / 100);

    if (!best.fitsRange) {
      flags.push('payment_out_of_range');
    }

    rows.push({
      vehicleId: v.id,
      vin: v.vin,
      title: `${v.year} ${v.make} ${v.model}`,
      imageUrl: v.imageUrl,
      salePrice: Math.round(best.price),
      monthlyPayment: Math.round(best.payment),
      frontGross: Math.round(front),
      backGross: Math.round(back),
      totalGross,
      flags,
    });
    } catch (e) {
      // Skip vehicles that cause errors in scoring (e.g., invalid data)
      console.error(`Error scoring vehicle ${v.id || v.vin}:`, (e as Error).message);
      continue;
    }
  }

  return rows.sort((a, b) => b.totalGross - a.totalGross);
}
