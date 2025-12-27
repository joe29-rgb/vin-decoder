/**
 * MODULE 3: TRADE-IN EQUITY CALCULATOR
 * Calculates trade-in equity and rollover limits by lender
 */

import { TradeInEquityResult, LenderType } from '../types/types';
import { getLenderProgram } from './lender-programs';

export function calculateTradeInEquity(
  tradeValue: number,
  outstandingBalance: number,
  lender: LenderType,
  tier: string
): TradeInEquityResult {
  const equity = tradeValue - outstandingBalance;
  const program = getLenderProgram(lender, tier);

  if (!program) {
    throw new Error(`Invalid lender/tier: ${lender}/${tier}`);
  }

  if (equity >= 0) {
    return {
      type: 'positive',
      equityAmount: equity,
      canRollover: false,
      maxRolloverLimit: 0,
      rolledAmount: 0,
      note: `$${equity.toFixed(2)} positive equity available as credit`,
    };
  }

  const negativeAmount = Math.abs(equity);
  const canRoll = negativeAmount <= program.negativeEquityLimit;

  return {
    type: 'negative',
    equityAmount: negativeAmount,
    canRollover: canRoll,
    maxRolloverLimit: program.negativeEquityLimit,
    rolledAmount: canRoll ? negativeAmount : 0,
    note: canRoll
      ? `$${negativeAmount.toFixed(2)} negative equity can be rolled (limit: $${program.negativeEquityLimit})` 
      : `$${negativeAmount.toFixed(2)} negative equity EXCEEDS ${lender} limit of $${program.negativeEquityLimit}`,
  };
}

export function getTradeInTaxImpact(
  salePrice: number,
  tradeCredit: number,
  rolledNegativeEquity: number
): { taxableBase: number; taxSavings: number } {
  const taxableBase = salePrice - tradeCredit;
  const taxSavings = tradeCredit;

  return {
    taxableBase,
    taxSavings,
  };
}
