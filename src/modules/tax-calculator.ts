/**
 * MODULE 7: CANADIAN PROVINCIAL TAX CALCULATOR
 * Calculates sales tax by province with trade-in credit deduction
 */

import { TaxResult, Province } from '../types/types';

const TAX_RATES: Record<Province, number> = {
  AB: 0.05,
  BC: 0.12,
  SK: 0.11,
  MB: 0.12,
  ON: 0.13,
  QC: 0.14975,
  NS: 0.15,
  NB: 0.15,
  PE: 0.15,
  NL: 0.15,
};

export function calculateTaxSavings(
  salePrice: number,
  tradeInCredit: number,
  province: Province
): TaxResult {
  const taxRate = TAX_RATES[province];
  if (!taxRate) throw new Error(`Unknown province: ${province}`);

  const taxableBase = salePrice - tradeInCredit;
  const totalTax = taxableBase * taxRate;
  const taxWithoutTrade = salePrice * taxRate;
  const taxSavings = taxWithoutTrade - totalTax;

  return {
    province,
    taxRate,
    salePrice,
    taxableBase,
    totalTax: Math.round(totalTax * 100) / 100,
    taxSavingsWithTrade: Math.round(taxSavings * 100) / 100,
  };
}
