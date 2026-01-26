/**
 * PROFIT MAXIMIZATION ENGINE
 * 
 * This module calculates maximum profit potential for each approval program.
 * Key insight: Lower rate = MORE advance capacity = MORE profit potential
 * 
 * Features:
 * - Calculate maximum advance for each approval
 * - Factor in subvented rates for new FCA vehicles
 * - Rank approvals by profit potential
 * - Show profit comparison across programs
 */

import { ApprovalSpec, Vehicle, TradeInfo } from '../types/types';
import { getLenderProgram, getSubventedRate, calculateTDReserve, calculateIAReserve, calculateEdenParkReserve, calculateAutoCapitalReserve, calculatePreferaReserve } from './lender-programs';
import { calculateMonthlyPayment } from './payment-calculator';
import { getPPSAFee } from '../constants/provincial-fees';

export interface ProfitScenario {
  lender: string;
  program: string;
  rate: number;
  isSubvented: boolean;
  maxAdvance: number;
  maxSellingPrice: number;
  frontGross: number;
  reserve: number;
  aftermarketCapacity: number;
  backGross: number;
  totalGross: number;
  profitRank: number;
}

export type RecommendationType = 'HIGHEST_PROFIT' | 'GOOD_ALTERNATIVE' | 'LAST_RESORT';

export interface ApprovalWithProfit extends ApprovalSpec {
  maxAdvance: number;
  profitPotential: number;
  rank: number;
  recommendation: RecommendationType;
}

/**
 * Calculate maximum advance (principal) for a given payment, rate, and term
 * This is the inverse of the payment calculation
 * 
 * Formula: P = PMT × [(1 - (1 + r)^-n) / r]
 * Where: P = Principal, PMT = Payment, r = Monthly rate, n = Number of months
 */
export function calculateMaximumAdvance(
  monthlyPayment: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return monthlyPayment * termMonths;
  }
  
  const maxPrincipal = monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate);
  return Math.floor(maxPrincipal);
}

/**
 * Get dynamic reserve based on lender and amount financed
 */
function getDynamicReserve(lender: string, program: string, amountFinanced: number): number {
  const lenderNorm = lender.toLowerCase();
  
  if (lenderNorm.includes('td')) {
    return calculateTDReserve(amountFinanced);
  }
  
  if (lenderNorm.includes('ia') || lenderNorm.includes('auto finance')) {
    return calculateIAReserve(amountFinanced);
  }
  
  if (lenderNorm.includes('eden')) {
    return calculateEdenParkReserve(amountFinanced);
  }
  
  if (lenderNorm.includes('autocapital')) {
    return calculateAutoCapitalReserve(amountFinanced);
  }
  
  if (lenderNorm.includes('prefera')) {
    return calculatePreferaReserve(amountFinanced);
  }
  
  // For lenders with fixed reserves, get from program data
  const programData = getLenderProgram(lender as any, program);
  return programData?.reserve || 0;
}

/**
 * Calculate profit scenario for a vehicle with a specific approval
 * Factors in subvented rates for new FCA vehicles
 */
export function calculateProfitScenario(
  vehicle: Vehicle,
  approval: ApprovalSpec,
  trade: TradeInfo,
  province: string = 'AB',
  docFee: number = 799
): ProfitScenario {
  const termMonths = approval.termMonths || 84;
  
  // Check if subvented rate applies (new 2024-2026 FCA vehicles)
  let rate = approval.apr;
  let isSubvented = false;
  
  if (vehicle.year >= 2024 && vehicle.year <= 2026) {
    const fcaBrands = ['chrysler', 'dodge', 'jeep', 'ram'];
    if (fcaBrands.includes((vehicle.make || '').toLowerCase())) {
      const subventedRate = getSubventedRate(
        approval.bank,
        approval.program || '',
        vehicle.year,
        vehicle.make || '',
        0 // We'll calculate this properly below
      );
      
      if (subventedRate !== null) {
        rate = subventedRate;
        isSubvented = true;
      }
    }
  }
  
  // Calculate maximum advance at full payment
  const maxAdvance = calculateMaximumAdvance(approval.paymentMax, rate, termMonths);
  
  // Calculate fees
  const ppsaFee = getPPSAFee(province);
  const programData = getLenderProgram(approval.bank as any, approval.program || '');
  const lenderFee = programData?.fee || 0;
  const totalFees = docFee + ppsaFee + lenderFee;
  
  // Calculate trade net
  const tradeNet = (trade.allowance || 0) - (trade.lienBalance || 0);
  
  // Calculate maximum selling price
  // maxAdvance = sellingPrice + fees + aftermarket - downPayment - tradeNet
  // sellingPrice = maxAdvance - fees - aftermarket + downPayment + tradeNet
  // For max selling price, assume no aftermarket initially
  const maxSellingPrice = maxAdvance - totalFees + (approval.downPayment || 0) + tradeNet;
  
  // Calculate front gross
  const vehicleCost = vehicle.yourCost || vehicle.blackBookValue || 0;
  const reserve = getDynamicReserve(approval.bank, approval.program || '', maxAdvance);
  const frontGross = Math.max(0, (maxSellingPrice - vehicleCost) + reserve);
  
  // Calculate aftermarket capacity
  // This is how much room we have left for aftermarket products
  const aftermarketCapacity = Math.max(0, maxAdvance - maxSellingPrice - totalFees + (approval.downPayment || 0) + tradeNet);
  
  // Estimate back gross (assume 50% margin on aftermarket)
  const backGross = aftermarketCapacity * 0.5;
  
  // Total gross profit
  const totalGross = frontGross + backGross;
  
  return {
    lender: approval.bank,
    program: approval.program || '',
    rate: rate,
    isSubvented: isSubvented,
    maxAdvance: maxAdvance,
    maxSellingPrice: maxSellingPrice,
    frontGross: frontGross,
    reserve: reserve,
    aftermarketCapacity: aftermarketCapacity,
    backGross: backGross,
    totalGross: totalGross,
    profitRank: totalGross,
  };
}

/**
 * Calculate profit scenarios for a vehicle across all approvals
 * Returns scenarios sorted by profit potential (highest first)
 */
export function calculateAllProfitScenarios(
  vehicle: Vehicle,
  approvals: ApprovalSpec[],
  trade: TradeInfo,
  province: string = 'AB',
  docFee: number = 799
): ProfitScenario[] {
  const scenarios = approvals.map(approval => 
    calculateProfitScenario(vehicle, approval, trade, province, docFee)
  );
  
  // Sort by total gross (highest profit first)
  return scenarios.sort((a, b) => b.totalGross - a.totalGross);
}

/**
 * Rank approvals by profit potential
 * Returns approvals sorted by maximum advance capacity (higher = more profit potential)
 */
export function rankApprovalsByProfit(
  approvals: ApprovalSpec[],
  termMonths: number = 84
): ApprovalWithProfit[] {
  const rankedApprovals = approvals.map(approval => {
    const maxAdvance = calculateMaximumAdvance(
      approval.paymentMax,
      approval.apr,
      termMonths
    );
    
    return {
      ...approval,
      maxAdvance: maxAdvance,
      profitPotential: maxAdvance,
      rank: 0,
      recommendation: 'GOOD_ALTERNATIVE' as RecommendationType,
    };
  });
  
  // Sort by max advance (highest first = most profit potential)
  rankedApprovals.sort((a, b) => b.maxAdvance - a.maxAdvance);
  
  // Assign ranks and recommendations
  rankedApprovals.forEach((approval, index) => {
    approval.rank = index + 1;
    
    if (index === 0) {
      approval.recommendation = 'HIGHEST_PROFIT';
    } else if (index >= rankedApprovals.length - 1) {
      approval.recommendation = 'LAST_RESORT';
    } else {
      approval.recommendation = 'GOOD_ALTERNATIVE';
    }
  });
  
  return rankedApprovals;
}

/**
 * Get the best approval for maximum profit on a specific vehicle
 */
export function getBestApprovalForVehicle(
  vehicle: Vehicle,
  approvals: ApprovalSpec[],
  trade: TradeInfo,
  province: string = 'AB',
  docFee: number = 799
): ProfitScenario | null {
  const scenarios = calculateAllProfitScenarios(vehicle, approvals, trade, province, docFee);
  return scenarios.length > 0 ? scenarios[0] : null;
}

/**
 * Calculate profit loss if using a suboptimal program
 */
export function calculateProfitLoss(
  bestScenario: ProfitScenario,
  alternativeScenario: ProfitScenario
): {
  grossLoss: number;
  advanceLoss: number;
  percentageLoss: number;
} {
  const grossLoss = bestScenario.totalGross - alternativeScenario.totalGross;
  const advanceLoss = bestScenario.maxAdvance - alternativeScenario.maxAdvance;
  const percentageLoss = bestScenario.totalGross > 0 
    ? (grossLoss / bestScenario.totalGross) * 100 
    : 0;
  
  return {
    grossLoss: Math.max(0, grossLoss),
    advanceLoss: Math.max(0, advanceLoss),
    percentageLoss: Math.max(0, percentageLoss),
  };
}
