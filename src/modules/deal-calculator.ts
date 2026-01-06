import { getPaymentSummary } from './payment-calculator';
import { findRule } from './rules-library';
import { ApprovalSpec, TradeInfo, Vehicle } from '../types/types';

export interface DealCalculation {
  vehiclePrice: number;
  downPayment: number;
  tradeAllowance: number;
  tradeLien: number;
  tradeEquity: number;
  amountFinanced: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  apr: number;
  termMonths: number;
  lenderName: string;
  dealerReserve: number;
  frontGross: number;
  backGross: number;
  totalGross: number;
}

export interface LenderComparison {
  lenderName: string;
  program: string;
  apr: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  approvalOdds: number;
  dealerReserve: number;
  ltv: number;
  maxLoanAmount: number;
}

export interface CustomerProfile {
  monthlyIncome: number;
  downPayment: number;
  tradeYear?: number;
  tradeMake?: string;
  tradeModel?: string;
  tradeMileage?: number;
  tradeAllowance: number;
  tradeLien: number;
  creditTier?: string;
  preferredLender?: string;
  preferredTerm?: number;
}

export function calculateDeal(
  vehicle: Vehicle,
  customer: CustomerProfile,
  lender: string,
  apr: number,
  termMonths: number
): DealCalculation {
  const vehiclePrice = vehicle.suggestedPrice || 0;
  const downPayment = customer.downPayment || 0;
  const tradeAllowance = customer.tradeAllowance || 0;
  const tradeLien = customer.tradeLien || 0;
  const tradeEquity = tradeAllowance - tradeLien;

  const fees = 495; // Standard admin fee
  const taxes = vehiclePrice * 0.05; // 5% GST (simplified)

  const amountFinanced = Math.max(0, vehiclePrice - downPayment - tradeEquity + fees + taxes);

  const payment = getPaymentSummary(amountFinanced, apr, termMonths);

  const totalInterest = payment.totalInterest;
  const totalCost = amountFinanced + totalInterest;

  const cost = vehicle.yourCost || vehiclePrice * 0.85;
  const frontGross = vehiclePrice - cost + (tradeAllowance > 0 ? Math.max(0, tradeAllowance - (vehicle.blackBookValue || tradeAllowance * 0.9)) : 0);
  
  const dealerReserve = amountFinanced * (apr * 0.01) * 0.02; // 2% of interest as reserve (simplified)
  const backGross = dealerReserve;

  const totalGross = frontGross + backGross;

  return {
    vehiclePrice,
    downPayment,
    tradeAllowance,
    tradeLien,
    tradeEquity,
    amountFinanced,
    monthlyPayment: payment.monthlyPayment,
    totalInterest,
    totalCost,
    apr,
    termMonths,
    lenderName: lender,
    dealerReserve,
    frontGross,
    backGross,
    totalGross,
  };
}

export function compareLenders(
  vehicle: Vehicle,
  customer: CustomerProfile,
  lenders: string[]
): LenderComparison[] {
  const comparisons: LenderComparison[] = [];

  for (const lenderName of lenders) {
    const rule = findRule(lenderName, 'Standard');
    if (!rule) continue;

    const vehiclePrice = vehicle.suggestedPrice || 0;
    const downPayment = customer.downPayment || 0;
    const tradeEquity = (customer.tradeAllowance || 0) - (customer.tradeLien || 0);
    
    const fees = 495;
    const taxes = vehiclePrice * 0.05;
    const amountFinanced = Math.max(0, vehiclePrice - downPayment - tradeEquity + fees + taxes);

    const ltv = vehiclePrice > 0 ? (amountFinanced / vehiclePrice) * 100 : 0;

    let termMonths = customer.preferredTerm || 72;
    if (rule.termByModelYear && vehicle.year) {
      for (const t of rule.termByModelYear) {
        if (vehicle.year >= t.yearFrom && vehicle.year <= t.yearTo) {
          termMonths = Math.min(termMonths, t.maxTermMonths);
          break;
        }
      }
    }

    const apr = 8.99;
    const payment = getPaymentSummary(amountFinanced, apr, termMonths);

    const dealerReserve = amountFinanced * (apr * 0.01) * 0.02;

    const maxLoanAmount = 75000;

    let approvalOdds = 75;
    if (ltv > 120) approvalOdds -= 20;
    if (amountFinanced > maxLoanAmount) approvalOdds -= 30;
    if (vehicle.year && vehicle.year < new Date().getFullYear() - 10) approvalOdds -= 15;
    approvalOdds = Math.max(10, Math.min(95, approvalOdds));

    comparisons.push({
      lenderName,
      program: rule.program || 'Standard',
      apr,
      termMonths,
      monthlyPayment: payment.monthlyPayment,
      totalInterest: payment.totalInterest,
      totalCost: amountFinanced + payment.totalInterest,
      approvalOdds,
      dealerReserve,
      ltv: Math.round(ltv * 10) / 10,
      maxLoanAmount,
    });
  }

  comparisons.sort((a, b) => b.approvalOdds - a.approvalOdds);

  return comparisons;
}

export function calculatePaymentRange(
  vehiclePrice: number,
  downPayment: number,
  tradeEquity: number,
  aprMin: number,
  aprMax: number,
  termMin: number,
  termMax: number
): { minPayment: number; maxPayment: number } {
  const fees = 495;
  const taxes = vehiclePrice * 0.05;
  const amountFinanced = Math.max(0, vehiclePrice - downPayment - tradeEquity + fees + taxes);

  const minPaymentCalc = getPaymentSummary(amountFinanced, aprMin, termMax);
  const maxPaymentCalc = getPaymentSummary(amountFinanced, aprMax, termMin);

  return {
    minPayment: minPaymentCalc.monthlyPayment,
    maxPayment: maxPaymentCalc.monthlyPayment,
  };
}

export function optimizeDeal(
  vehicle: Vehicle,
  customer: CustomerProfile,
  targetPayment: number,
  maxApr: number = 15.99
): DealCalculation | null {
  const vehiclePrice = vehicle.suggestedPrice || 0;
  let downPayment = customer.downPayment || 0;
  const tradeEquity = (customer.tradeAllowance || 0) - (customer.tradeLien || 0);

  const fees = 495;
  const taxes = vehiclePrice * 0.05;

  for (let term = 84; term >= 24; term -= 6) {
    for (let apr = 5.99; apr <= maxApr; apr += 0.5) {
      const amountFinanced = Math.max(0, vehiclePrice - downPayment - tradeEquity + fees + taxes);
      const payment = getPaymentSummary(amountFinanced, apr, term);

      if (Math.abs(payment.monthlyPayment - targetPayment) < 10) {
        return calculateDeal(vehicle, { ...customer, downPayment }, 'Optimized', apr, term);
      }
    }
  }

  for (downPayment = customer.downPayment || 0; downPayment <= vehiclePrice * 0.5; downPayment += 500) {
    const amountFinanced = Math.max(0, vehiclePrice - downPayment - tradeEquity + fees + taxes);
    const payment = getPaymentSummary(amountFinanced, 8.99, 72);

    if (Math.abs(payment.monthlyPayment - targetPayment) < 10) {
      return calculateDeal(vehicle, { ...customer, downPayment }, 'Optimized', 8.99, 72);
    }
  }

  return null;
}
