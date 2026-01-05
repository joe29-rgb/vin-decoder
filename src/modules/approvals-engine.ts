import { Vehicle, ApprovalSpec, TradeInfo, ScoredVehicleRow, Province, BackCapRule } from '../types/types';
import { calculateTaxSavings } from './tax-calculator';
import { getPaymentSummary } from './payment-calculator';
import { findRule } from './rules-library';

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
  const tax = calculateTaxSavings(salePrice, trade.allowance, province);
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
  const tax = calculateTaxSavings(salePrice, trade.allowance, province);
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
    const bb = vehicle.cbbWholesale ?? 0;
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
    const flags: string[] = [];
    // Use CBB Wholesale as the Black Book value for calculations
    const bb = v.cbbWholesale;
    if (bb == null || isNaN(bb) || bb === 0) {
      flags.push('missing_cbb_wholesale');
      continue;
    }
    if (v.yourCost == null || isNaN(v.yourCost)) {
      flags.push('missing_cost');
      continue;
    }

    // Load dynamic lender rule if available
    const rule = findRule(approval.bank, approval.program);

    // Effective caps & constraints
    const frontCapFactorEff = approval.frontCapFactor ?? rule?.frontCapFactor;
    const backCapEff: BackCapRule | undefined = approval.backCap ?? rule?.backCap;

    // Term may be constrained by model year
    let termMonthsEff = approval.termMonths;
    if (rule?.termByModelYear && Array.isArray(rule.termByModelYear)) {
      for (const t of rule.termByModelYear) {
        if (v.year >= t.yearFrom && v.year <= t.yearTo) {
          termMonthsEff = Math.min(termMonthsEff, t.maxTermMonths);
        }
      }
    }

    // Payment call cap from lender rule (if lower than approval)
    const paymentMaxEff = Math.min(approval.paymentMax, rule?.maxPayCall ?? Number.POSITIVE_INFINITY);

    const frontCap = frontCapFactorEff != null ? bb * frontCapFactorEff : Number.POSITIVE_INFINITY;
    const minPrice = Math.max(v.yourCost, 0);
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
    const front = (best.price - v.yourCost) - overAllowance;

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
  }

  return rows.sort((a, b) => b.totalGross - a.totalGross);
}
