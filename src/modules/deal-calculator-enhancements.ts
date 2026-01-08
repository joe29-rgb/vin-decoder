/**
 * DEAL CALCULATOR ENHANCEMENTS MODULE
 * Bi-weekly payments, lease calculations, total cost of ownership
 */

import { Vehicle, ApprovalSpec } from '../types/types';
import { calculateTaxSavings } from './tax-calculator';

export interface BiWeeklyPayment {
  biWeeklyAmount: number;
  monthlyEquivalent: number;
  totalPayments: number;
  totalInterest: number;
  totalCost: number;
}

export interface LeaseCalculation {
  monthlyPayment: number;
  residualValue: number;
  totalLeaseCost: number;
  capitalizedCost: number;
  moneyFactor: number;
  depreciation: number;
}

export interface TotalCostOfOwnership {
  purchasePrice: number;
  financing: {
    downPayment: number;
    monthlyPayment: number;
    totalInterest: number;
    totalFinanced: number;
  };
  insurance: {
    monthlyEstimate: number;
    annualEstimate: number;
    totalOverTerm: number;
  };
  fuel: {
    monthlyEstimate: number;
    annualEstimate: number;
    totalOverTerm: number;
  };
  maintenance: {
    monthlyEstimate: number;
    annualEstimate: number;
    totalOverTerm: number;
  };
  depreciation: {
    estimatedValue: number;
    totalDepreciation: number;
  };
  totalCost: number;
}

/**
 * Calculate bi-weekly payment
 */
export function calculateBiWeeklyPayment(
  principal: number,
  apr: number,
  termMonths: number
): BiWeeklyPayment {
  // Convert APR to bi-weekly rate
  const biWeeklyRate = (apr / 100) / 26;
  const totalBiWeeklyPayments = (termMonths / 12) * 26;
  
  // Calculate bi-weekly payment using amortization formula
  let biWeeklyAmount: number;
  if (biWeeklyRate === 0) {
    biWeeklyAmount = principal / totalBiWeeklyPayments;
  } else {
    biWeeklyAmount = principal * (biWeeklyRate * Math.pow(1 + biWeeklyRate, totalBiWeeklyPayments)) /
                     (Math.pow(1 + biWeeklyRate, totalBiWeeklyPayments) - 1);
  }
  
  const totalPaid = biWeeklyAmount * totalBiWeeklyPayments;
  const totalInterest = totalPaid - principal;
  const monthlyEquivalent = (biWeeklyAmount * 26) / 12;
  
  return {
    biWeeklyAmount: Math.round(biWeeklyAmount * 100) / 100,
    monthlyEquivalent: Math.round(monthlyEquivalent * 100) / 100,
    totalPayments: totalBiWeeklyPayments,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalCost: Math.round(totalPaid * 100) / 100
  };
}

/**
 * Calculate lease payment
 */
export function calculateLeasePayment(
  msrp: number,
  residualPercent: number, // e.g., 55 for 55%
  apr: number,
  termMonths: number,
  downPayment: number = 0,
  tradeEquity: number = 0
): LeaseCalculation {
  const residualValue = msrp * (residualPercent / 100);
  const capitalizedCost = msrp - downPayment - tradeEquity;
  const depreciation = capitalizedCost - residualValue;
  
  // Convert APR to money factor (APR / 2400)
  const moneyFactor = apr / 2400;
  
  // Depreciation portion of payment
  const depreciationPayment = depreciation / termMonths;
  
  // Finance charge portion of payment
  const financeCharge = (capitalizedCost + residualValue) * moneyFactor;
  
  const monthlyPayment = depreciationPayment + financeCharge;
  const totalLeaseCost = (monthlyPayment * termMonths) + downPayment;
  
  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    residualValue: Math.round(residualValue * 100) / 100,
    totalLeaseCost: Math.round(totalLeaseCost * 100) / 100,
    capitalizedCost: Math.round(capitalizedCost * 100) / 100,
    moneyFactor: Math.round(moneyFactor * 100000) / 100000,
    depreciation: Math.round(depreciation * 100) / 100
  };
}

/**
 * Calculate total cost of ownership
 */
export function calculateTotalCostOfOwnership(
  vehicle: Vehicle,
  approval: ApprovalSpec,
  downPayment: number,
  tradeEquity: number = 0,
  estimatedMilesPerYear: number = 20000
): TotalCostOfOwnership {
  const salePrice = vehicle.suggestedPrice;
  const province = (approval.province || 'AB') as any;
  
  // Calculate tax
  const tax = calculateTaxSavings(salePrice, Math.max(0, tradeEquity), province, approval.isNativeStatus);
  
  // Calculate financing
  const principal = salePrice - downPayment - tradeEquity + tax.totalTax;
  const monthlyRate = (approval.apr / 100) / 12;
  const termMonths = approval.termMonths;
  
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                     (Math.pow(1 + monthlyRate, termMonths) - 1);
  }
  
  const totalFinanced = monthlyPayment * termMonths;
  const totalInterest = totalFinanced - principal;
  
  // Estimate insurance ($150-$300/month based on vehicle value)
  const insuranceMonthly = vehicle.suggestedPrice > 40000 ? 250 : 
                          vehicle.suggestedPrice > 25000 ? 200 : 150;
  const insuranceAnnual = insuranceMonthly * 12;
  const insuranceTotal = insuranceMonthly * termMonths;
  
  // Estimate fuel costs (assume $1.50/L, 10L/100km)
  const kmPerYear = estimatedMilesPerYear * 1.60934;
  const litersPerYear = (kmPerYear / 100) * 10;
  const fuelAnnual = litersPerYear * 1.50;
  const fuelMonthly = fuelAnnual / 12;
  const fuelTotal = fuelMonthly * termMonths;
  
  // Estimate maintenance ($100/month average)
  const maintenanceMonthly = 100;
  const maintenanceAnnual = maintenanceMonthly * 12;
  const maintenanceTotal = maintenanceMonthly * termMonths;
  
  // Estimate depreciation (15% per year for first 5 years, then 10%)
  const years = termMonths / 12;
  let estimatedValue = salePrice;
  for (let i = 0; i < years; i++) {
    const depRate = i < 5 ? 0.15 : 0.10;
    estimatedValue *= (1 - depRate);
  }
  const totalDepreciation = salePrice - estimatedValue;
  
  const totalCost = salePrice + totalInterest + insuranceTotal + fuelTotal + maintenanceTotal;
  
  return {
    purchasePrice: salePrice,
    financing: {
      downPayment,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalFinanced: Math.round(totalFinanced * 100) / 100
    },
    insurance: {
      monthlyEstimate: insuranceMonthly,
      annualEstimate: insuranceAnnual,
      totalOverTerm: Math.round(insuranceTotal * 100) / 100
    },
    fuel: {
      monthlyEstimate: Math.round(fuelMonthly * 100) / 100,
      annualEstimate: Math.round(fuelAnnual * 100) / 100,
      totalOverTerm: Math.round(fuelTotal * 100) / 100
    },
    maintenance: {
      monthlyEstimate: maintenanceMonthly,
      annualEstimate: maintenanceAnnual,
      totalOverTerm: Math.round(maintenanceTotal * 100) / 100
    },
    depreciation: {
      estimatedValue: Math.round(estimatedValue * 100) / 100,
      totalDepreciation: Math.round(totalDepreciation * 100) / 100
    },
    totalCost: Math.round(totalCost * 100) / 100
  };
}

/**
 * Calculate affordability (reverse calculate max price from budget)
 */
export function calculateAffordability(
  monthlyBudget: number,
  apr: number,
  termMonths: number,
  downPayment: number,
  tradeEquity: number = 0,
  province: string = 'AB',
  isNativeStatus: boolean = false
): {
  maxVehiclePrice: number;
  maxFinanced: number;
  estimatedTax: number;
} {
  // Work backwards from monthly payment to principal
  const monthlyRate = (apr / 100) / 12;
  
  let maxPrincipal: number;
  if (monthlyRate === 0) {
    maxPrincipal = monthlyBudget * termMonths;
  } else {
    maxPrincipal = monthlyBudget * (Math.pow(1 + monthlyRate, termMonths) - 1) /
                   (monthlyRate * Math.pow(1 + monthlyRate, termMonths));
  }
  
  // Estimate tax rate
  const taxRates: Record<string, number> = {
    'AB': 0.05, 'BC': 0.12, 'SK': 0.11, 'MB': 0.12,
    'ON': 0.13, 'QC': 0.14975, 'NS': 0.15, 'NB': 0.15,
    'PE': 0.15, 'NL': 0.15
  };
  const taxRate = isNativeStatus ? 0 : (taxRates[province] || 0.05);
  
  // Vehicle price = (principal - tax + downPayment + tradeEquity) / (1 + taxRate)
  // Simplified: assume tax on full price minus trade
  const maxVehiclePrice = (maxPrincipal + downPayment + tradeEquity) / (1 + taxRate);
  const estimatedTax = (maxVehiclePrice - Math.max(0, tradeEquity)) * taxRate;
  
  return {
    maxVehiclePrice: Math.round(maxVehiclePrice * 100) / 100,
    maxFinanced: Math.round(maxPrincipal * 100) / 100,
    estimatedTax: Math.round(estimatedTax * 100) / 100
  };
}

/**
 * Calculate rate buy-down cost
 */
export function calculateRateBuyDown(
  principal: number,
  currentAPR: number,
  targetAPR: number,
  termMonths: number
): {
  buyDownCost: number;
  monthlySavings: number;
  totalSavings: number;
  breakEvenMonths: number;
} {
  // Calculate current monthly payment
  const currentRate = (currentAPR / 100) / 12;
  const currentPayment = principal * (currentRate * Math.pow(1 + currentRate, termMonths)) /
                         (Math.pow(1 + currentRate, termMonths) - 1);
  
  // Calculate target monthly payment
  const targetRate = (targetAPR / 100) / 12;
  const targetPayment = principal * (targetRate * Math.pow(1 + targetRate, termMonths)) /
                        (Math.pow(1 + targetRate, termMonths) - 1);
  
  const monthlySavings = currentPayment - targetPayment;
  const totalSavings = monthlySavings * termMonths;
  
  // Estimate buy-down cost (typically 1-2% of principal per 1% rate reduction)
  const rateReduction = currentAPR - targetAPR;
  const buyDownCost = principal * (rateReduction / 100) * 1.5;
  
  const breakEvenMonths = buyDownCost / monthlySavings;
  
  return {
    buyDownCost: Math.round(buyDownCost * 100) / 100,
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    breakEvenMonths: Math.round(breakEvenMonths * 10) / 10
  };
}

/**
 * Payment breakdown by component
 */
export function calculatePaymentBreakdown(
  salePrice: number,
  downPayment: number,
  tradeEquity: number,
  apr: number,
  termMonths: number,
  province: string = 'AB',
  isNativeStatus: boolean = false
): {
  principal: number;
  tax: number;
  monthlyPayment: number;
  breakdown: {
    principalPortion: number;
    interestPortion: number;
    month: number;
    balance: number;
  }[];
} {
  const tax = calculateTaxSavings(salePrice, Math.max(0, tradeEquity), province as any, isNativeStatus);
  const principal = salePrice - downPayment - tradeEquity + tax.totalTax;
  
  const monthlyRate = (apr / 100) / 12;
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                         (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  // Generate amortization schedule
  const breakdown: any[] = [];
  let balance = principal;
  
  for (let month = 1; month <= termMonths; month++) {
    const interestPortion = balance * monthlyRate;
    const principalPortion = monthlyPayment - interestPortion;
    balance -= principalPortion;
    
    breakdown.push({
      month,
      principalPortion: Math.round(principalPortion * 100) / 100,
      interestPortion: Math.round(interestPortion * 100) / 100,
      balance: Math.round(Math.max(0, balance) * 100) / 100
    });
  }
  
  return {
    principal: Math.round(principal * 100) / 100,
    tax: Math.round(tax.totalTax * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    breakdown
  };
}
