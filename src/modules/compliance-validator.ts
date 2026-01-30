/**
 * MODULE 4: DSR & LTV COMPLIANCE VALIDATOR
 * Validates Debt Service Ratio and Loan-to-Value against lender limits
 */

import { ComplianceResult, LenderType } from '../types/types';
import { getLenderProgram, getEffectiveLTV } from './lender-programs';

export function validateCompliance(
  monthlyPayment: number,
  monthlyIncome: number,
  financeAmount: number,
  cbbWholesaleValue: number,
  lender: LenderType,
  tier: string,
  vehicleYear?: number
): ComplianceResult {
  const program = getLenderProgram(lender, tier);
  if (!program) {
    throw new Error(`Invalid lender/tier: ${lender}/${tier}`);
  }

  const dsr = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 0;
  const dsrPass = dsr <= program.maxDsr;

  // Use dynamic LTV based on vehicle year (TD: 125% for new 2024-2026, 140% for used)
  const effectiveLTV = vehicleYear ? getEffectiveLTV(lender, tier, vehicleYear) : program.ltv;
  const ltv = cbbWholesaleValue > 0 ? (financeAmount / cbbWholesaleValue) * 100 : 0;
  const ltvPass = ltv <= effectiveLTV;

  const warnings: string[] = [];

  if (dsr > program.maxDsr * 0.9) {
    warnings.push(`HIGH DSR: ${dsr.toFixed(1)}% (max: ${program.maxDsr}%)`);
  }
  if (ltv > 130) {
    warnings.push(`HIGH LTV: ${ltv.toFixed(1)}% - minimal equity cushion`);
  }
  if (dsr > program.maxDsr && ltv > effectiveLTV) {
    warnings.push('MARGINAL DEAL: Both DSR and LTV are high');
  }

  return {
    dsr: Math.round(dsr * 100) / 100,
    dsrPass,
    ltv: Math.round(ltv * 100) / 100,
    ltvPass,
    overall: dsrPass && ltvPass,
    warnings,
  };
}

export function checkIncomeRequirement(
  monthlyIncome: number,
  lender: LenderType,
  tier: string
): boolean {
  const program = getLenderProgram(lender, tier);
  if (!program) return false;
  return monthlyIncome >= program.minIncome;
}
