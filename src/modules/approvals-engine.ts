import { Vehicle, ApprovalSpec, TradeInfo, ScoredVehicleRow, Province, BackCapRule } from '../types/types';
import { calculateTaxSavings } from './tax-calculator';
import { getPaymentSummary } from './payment-calculator';
import { findRule } from './rules-library';
import { getContactsForBank } from './lender-contacts';

const DEFAULT_DEALER_FEE = 805;
const DEFAULT_LENDER_FEE = 0;
const DEFAULT_PROVINCE: Province = 'AB';

function totalFees(approval: ApprovalSpec): number {
  const dealer = approval.dealerAdminFee != null ? approval.dealerAdminFee : DEFAULT_DEALER_FEE;
  const lender = approval.lenderAdminFee != null ? approval.lenderAdminFee : DEFAULT_LENDER_FEE;
  return (dealer || 0) + (lender || 0);
}

function formatCurrency(n: number): string { return `$${Math.round(n).toLocaleString()}`; }
function formatPayment(n: number): string { return `$${Math.round(n)} / mo`; }
function periodicFromMonthly(monthly: number, freq?: ApprovalSpec['paymentFrequency']): { label: string; amount: number } | null {
  const m = Math.max(0, monthly);
  switch (freq) {
    case 'biweekly': return { label: 'bi-weekly', amount: Math.round((m * 12) / 26) };
    case 'weekly': return { label: 'weekly', amount: Math.round((m * 12) / 52) };
    case 'semimonthly': return { label: 'semi-monthly', amount: Math.round(m / 2) };
    default: return null;
  }
}

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
  const principal = salePrice - down - equity + totalFees(approval) + tax.totalTax;

  const { monthlyPayment } = getPaymentSummary(
    Math.max(1, principal),
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
  const principal = salePrice - down - equity + totalFees(approval) + tax.totalTax;
  return Math.max(0, principal);
}

function computeBaseForLtv(base: 'black_book' | 'sale_price' | 'msrp' | undefined, salePrice: number, vehicle: Vehicle): number {
  const b = base || 'black_book';
  if (b === 'sale_price') return Math.max(1, salePrice);
  if (b === 'msrp') {
    const msrpRaw = (vehicle as any).msrp;
    const msrp = (msrpRaw != null && !isNaN(msrpRaw)) ? Number(msrpRaw) : 0;
    return Math.max(1, msrp || 1);
  }
  const bb = vehicle.blackBookValue ?? 0;
  return Math.max(1, bb || 1);
}

function matchReserveGridPercent(
  apr: number,
  term: number,
  principal: number,
  bands: any[] | undefined
): { amount: number; percent: number } | null {
  if (!Array.isArray(bands) || !bands.length) return null;
  for (const band of bands) {
    const rateOk = (typeof band.rate === 'number' ? Math.abs(apr - band.rate) < 0.0001 : true)
      && (band.rateMin == null || apr >= band.rateMin)
      && (band.rateMax == null || apr <= band.rateMax);
    const termOk = (band.termMin == null || term >= band.termMin) && (band.termMax == null || term <= band.termMax);
    if (!rateOk || !termOk) continue;
    if (!Array.isArray(band.brackets)) continue;
    for (const br of band.brackets) {
      if (principal >= br.minFinanced && principal <= br.maxFinanced) {
        const pct = br.percent || 0;
        const amt = br.amount || 0;
        return { amount: amt, percent: pct };
      }
    }
  }
  return null;
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
    const bb = vehicle.blackBookValue ?? 0;
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
    // Be resilient: allow scoring even if BB or cost are missing; mark flags and use defaults
    const bbRaw = v.blackBookValue as any;
    const cbbRetailRaw = (v as any).cbbRetail as any;
    const cbbWholesaleRaw = (v as any).cbbWholesale as any;
    const costRaw = v.yourCost as any;
    let bbEff = 0;
    if (bbRaw != null && !isNaN(bbRaw)) {
      bbEff = Number(bbRaw);
    } else if (cbbRetailRaw != null && !isNaN(cbbRetailRaw)) {
      bbEff = Number(cbbRetailRaw);
      flags.push('bb_from_cbb_retail');
    } else if (cbbWholesaleRaw != null && !isNaN(cbbWholesaleRaw)) {
      bbEff = Number(cbbWholesaleRaw);
      flags.push('bb_from_cbb_wholesale');
    } else {
      flags.push('missing_black_book');
    }
    const costEff = (costRaw == null || isNaN(costRaw)) ? (flags.push('missing_cost'), 0) : Number(costRaw);

    // Load dynamic lender rule if available
    const rule = findRule(approval.bank, approval.program);

    // Effective caps & constraints
    const frontCapFactorEff = approval.frontCapFactor ?? rule?.frontCapFactor;
    const backCapEff: BackCapRule | undefined = approval.backCap ?? rule?.backCap;

    // Term may be constrained by model year and odometer
    let termMonthsEff = approval.termMonths;
    const mileageRaw: any = (v as any).mileage;
    const hasMileage = mileageRaw != null && !isNaN(mileageRaw);
    const mileageNum = hasMileage ? Number(mileageRaw) : NaN;
    if (rule) {
      const needsMileage = (Array.isArray(rule.termByOdometer) && rule.termByOdometer.length > 0)
        || (Array.isArray(rule.termByYearAndOdometer) && rule.termByYearAndOdometer.length > 0);
      if (needsMileage && !hasMileage) {
        flags.push('missing_mileage');
        continue;
      }
      if (Array.isArray(rule.termByModelYear)) {
        for (const t of rule.termByModelYear) {
          if (v.year >= t.yearFrom && v.year <= t.yearTo) {
            termMonthsEff = Math.min(termMonthsEff, t.maxTermMonths);
          }
        }
      }
      if (hasMileage && Array.isArray(rule.termByOdometer)) {
        for (const t of rule.termByOdometer) {
          if (mileageNum >= t.kmFrom && mileageNum <= t.kmTo) {
            termMonthsEff = Math.min(termMonthsEff, t.maxTermMonths);
          }
        }
      }
      if (hasMileage && Array.isArray(rule.termByYearAndOdometer)) {
        for (const t of rule.termByYearAndOdometer) {
          if (v.year >= t.yearFrom && v.year <= t.yearTo && mileageNum >= t.kmFrom && mileageNum <= t.kmTo) {
            termMonthsEff = Math.min(termMonthsEff, t.maxTermMonths);
          }
        }
      }
    }

    // Payment call cap from lender rule (if lower than approval)
    const paymentMaxEff = Math.min(approval.paymentMax, rule?.maxPayCall ?? Number.POSITIVE_INFINITY);
    // Province for tax/principal computations (used below in LTV cap search as well)
    const province = approval.province || DEFAULT_PROVINCE;

    // If BB is missing or 0, do NOT apply a front-cap based on BB
    let frontCap = (frontCapFactorEff != null && bbEff > 0) ? (bbEff * frontCapFactorEff) : Number.POSITIVE_INFINITY;
    // Optional: max front-end advance (e.g., 140% of BB or MSRP)
    if (rule?.maxFrontEndAdvance) {
      const baseForFront = computeBaseForLtv(rule.frontAdvanceBase || 'black_book', 0, v);
      if (baseForFront > 0) {
        const capByAdvance = rule.maxFrontEndAdvance * baseForFront;
        frontCap = Math.min(frontCap, capByAdvance);
      }
    }
    // Base price candidates: cost, suggestedPrice, BlackBook, CBB retail/wholesale
    const sp = Number((v as any).suggestedPrice ?? 0) || 0;
    const cbbR = Number((v as any).cbbRetail || 0) || 0;
    const cbbW = Number((v as any).cbbWholesale || 0) || 0;
    const baseCandidates = [
      costEff > 0 ? costEff : 0,
      sp,
      bbEff > 0 ? bbEff : 0,
      cbbR,
      cbbW,
      1,
    ];
    const minPrice = Math.max(...baseCandidates);
    // Base cap by front and a reasonable search ceiling
    let maxPriceCap = Math.min(frontCap, minPrice + 100000);
    // Optional: cap by all-in LTV (principal <= maxAllInLTV * base)
    if (rule?.maxAllInLTV && rule.maxAllInLTV > 0) {
      const baseKind = rule.ltvBase || 'black_book';
      if (baseKind !== 'sale_price') {
        const baseVal = computeBaseForLtv(baseKind, 0, v);
        if (baseVal > 0) {
          const principalCap = rule.maxAllInLTV * Math.max(1, baseVal);
          // Binary search highest price whose principal <= principalCap
          let lo2 = minPrice;
          let hi2 = maxPriceCap;
          let best2 = lo2;
          for (let i2 = 0; i2 < 40; i2++) {
            const mid2 = (lo2 + hi2) / 2;
            const p2 = computePrincipal(mid2, approval, trade, province);
            if (p2 <= principalCap) { best2 = mid2; lo2 = mid2; } else { hi2 = mid2; }
          }
          maxPriceCap = Math.min(maxPriceCap, best2);
        }
      }
    }
    const maxPrice = Math.max(minPrice, maxPriceCap);

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
    const front = (best.price - costEff) - overAllowance;

    // Compute amount financed (principal) for reserve calculations
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
    // Reserve via rate/term grid tables
    if (rule?.reserveByRateTable) {
      const grid = matchReserveGridPercent(approval.apr, termMonthsEff, principal, rule.reserveByRateTable as any);
      if (grid) {
        reserve += (grid.percent || 0) * principal + (grid.amount || 0);
      }
    }
    // Reserve adders for +1%/+2% upsell relative to baseApr (e.g., TD Keys)
    if (rule?.reserveByRateIncrease && typeof rule.baseApr === 'number') {
      const delta = approval.apr - rule.baseApr;
      const which = delta >= 1.5 ? rule.reserveByRateIncrease.plus2 : (delta >= 0.5 ? rule.reserveByRateIncrease.plus1 : undefined);
      if (which) {
        if (which.percentOfFinanced) reserve += which.percentOfFinanced * principal;
        if (Array.isArray(which.fixedByFinancedAmount)) {
          const br2 = which.fixedByFinancedAmount.find(b => principal >= b.minFinanced && principal <= b.maxFinanced);
          if (br2) reserve += br2.amount;
        }
      }
    }
    // LTV bonus (e.g., Santander Prime LTV bonus for LTV < 130%)
    if (Array.isArray(rule?.ltvBonus)) {
      for (const b of (rule!.ltvBonus!)) {
        const baseVal = computeBaseForLtv(b.base, best.price, v);
        const ltv = baseVal > 0 ? (principal / baseVal) : Number.POSITIVE_INFINITY;
        const lowerOk = (b.ltvMin == null) ? true : (ltv >= b.ltvMin);
        const upperOk = (b.ltvMax == null) ? true : (ltv <= b.ltvMax);
        if (lowerOk && upperOk) {
          if (b.minFinanced == null || principal >= b.minFinanced) {
            if (b.maxFinanced == null || principal <= b.maxFinanced) {
              reserve += b.amount;
            }
          }
        }
      }
    }

    // Apply back-end cap if present
    if (backCapEff) {
      let capAmt = 0;
      if (backCapEff.type === 'percent_of_bb') capAmt = backCapEff.percent * (bbEff ?? 0);
      else capAmt = backCapEff.percent * best.price;
      reserve = Math.min(reserve, capAmt);
    }

    const back = Math.max(0, Math.round(reserve));
    const totalGross = Math.max(0, Math.round((front + back) * 100) / 100);

    if (!best.fitsRange) { flags.push('payment_out_of_range'); }
    // Flags for caps
    if (rule?.maxFrontEndAdvance) {
      const baseForFront2 = computeBaseForLtv(rule.frontAdvanceBase || 'black_book', best.price, v);
      if (baseForFront2 > 0 && best.price > rule.maxFrontEndAdvance * baseForFront2 + 1) {
        flags.push('front_cap_exceeded');
      }
    }
    if (rule?.maxAllInLTV) {
      const baseKind2 = rule.ltvBase || 'black_book';
      const baseVal2 = computeBaseForLtv(baseKind2, best.price, v);
      if (baseVal2 > 0) {
        const ltv2 = principal / baseVal2;
        if (ltv2 > rule.maxAllInLTV + 1e-6) flags.push('all_in_ltv_exceeded');
      }
    }

    // Amount financed & dealertrack copy
    const amountFinanced = Math.round(principal);
    const period = periodicFromMonthly(best.payment, approval.paymentFrequency);
    const lines: string[] = [];
    lines.push(`${v.year || ''} ${v.make || ''} ${v.model || ''}  (${v.vin || 'N/A'})`);
    lines.push(`Odometer: ${hasMileage ? `${Math.round(Number(mileageRaw)).toLocaleString()} km` : 'N/A'}`);
    lines.push(`Bank: ${approval.bank}  Program: ${approval.program}`);
    lines.push(`Province: ${province}  Term: ${termMonthsEff}  APR: ${approval.apr.toFixed(2)}%  Down: ${formatCurrency(approval.downPayment || 0)}`);
    lines.push(`Sale Price: ${formatCurrency(best.price)}  Fees: ${formatCurrency(totalFees(approval))}  Taxes: ${formatCurrency(calculateTaxSavings(best.price, trade.allowance, province).totalTax)}`);
    lines.push(`Trade Allow: ${formatCurrency(trade.allowance)}  ACV: ${formatCurrency(trade.acv)}  Lien: ${formatCurrency(trade.lienBalance)}`);
    lines.push(`Amount Financed: ${formatCurrency(amountFinanced)}`);
    if (rule?.maxAllInLTV) {
      const baseVal3 = computeBaseForLtv(rule.ltvBase || 'black_book', best.price, v);
      if (baseVal3 > 0) {
        const ltvPct = Math.round((amountFinanced / baseVal3) * 100);
        lines.push(`All-In LTV: ${ltvPct}%`);
      }
    }
    lines.push(`Payment: ${formatPayment(best.payment)}${period ? `  (~$${period.amount} ${period.label})` : ''}`);
    if (back > 0) lines.push(`Reserve/Bonus: ${formatCurrency(back)}`);

    const dealertrackCopy = lines.join(' \n ');

    rows.push({
      vehicleId: v.id,
      vin: v.vin,
      title: `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim(),
      imageUrl: v.imageUrl,
      salePrice: Math.round(best.price),
      monthlyPayment: Math.round(best.payment),
      frontGross: Math.round(front),
      backGross: Math.round(back),
      totalGross,
      flags,
      amountFinanced,
      apr: approval.apr,
      termMonths: termMonthsEff,
      dealertrackCopy,
      bank: approval.bank,
      program: approval.program,
      contacts: (rule && rule.contacts && rule.contacts.length ? rule.contacts : (getContactsForBank(approval.bank)?.contacts)) || undefined,
      lenderAddress: (rule && rule.lenderAddress) || getContactsForBank(approval.bank)?.address,
    });
  }

  return rows.sort((a, b) => b.totalGross - a.totalGross);
}
