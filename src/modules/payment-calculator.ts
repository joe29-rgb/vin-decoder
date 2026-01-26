/**
 * PAYMENT CALCULATOR MODULE
 * Amortized payment calculation using exact formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
 * Production-ready with full error handling and JSDoc
 */

import { PaymentCalculationResult, AmortizationEntry } from '../types/types';

/**
 * Calculates monthly payment using amortized formula
 * Formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
 * where r = monthly interest rate (annual rate ÷ 12 ÷ 100)
 * 
 * @param principal - Loan amount in dollars ($7,500-$100,000)
 * @param annualRate - Annual interest rate as percentage (5-35%)
 * @param numberOfMonths - Loan term in months (24-84)
 * @returns PaymentCalculationResult with monthly payment (rounded to nearest $5), total interest, and amortization schedule
 * @throws Error if validation fails
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  numberOfMonths: number
): PaymentCalculationResult {
  // Validate inputs
  const validationErrors = validatePaymentInputs(principal, annualRate, numberOfMonths);
  if (validationErrors.length > 0) {
    throw new Error(
      `Payment calculation validation failed:\n${validationErrors
        .map((e) => `  - ${e.message}`)
        .join("\n")}`
    );
  }

  // Calculate monthly interest rate
  const monthlyRate = annualRate / 12 / 100;

  // Handle edge case: 0% interest
  let monthlyPaymentRaw: number;
  if (monthlyRate === 0) {
    monthlyPaymentRaw = principal / numberOfMonths;
  } else {
    // Apply amortized formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfMonths);
    const denominator = Math.pow(1 + monthlyRate, numberOfMonths) - 1;
    monthlyPaymentRaw = principal * (numerator / denominator);
  }

  // Round to nearest $5
  const monthlyPayment = Math.round(monthlyPaymentRaw / 5) * 5;

  // Generate full amortization schedule
  const amortizationSchedule = generateAmortizationSchedule(
    principal,
    monthlyRate,
    monthlyPayment,
    numberOfMonths
  );

  // Calculate totals
  const totalInterest = amortizationSchedule.reduce((sum, entry) => sum + entry.interest, 0);
  const totalAmortized = monthlyPayment * numberOfMonths;

  return {
    monthlyPayment,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmortized,
    amortizationSchedule,
  };
}

/**
 * Validates payment calculation inputs
 * @private
 * @returns Array of validation errors (empty if valid)
 */
function validatePaymentInputs(
  principal: number,
  annualRate: number,
  numberOfMonths: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate principal
  if (typeof principal !== "number" || isNaN(principal)) {
    errors.push({
      field: "principal",
      value: principal,
      message: "Principal must be a valid number",
    });
  } else if (principal <= 0) {
    errors.push({
      field: "principal",
      value: principal,
      message: "Principal must be greater than zero",
    });
  }

  // Validate annual rate
  if (typeof annualRate !== "number" || isNaN(annualRate)) {
    errors.push({
      field: "annualRate",
      value: annualRate,
      message: "Annual rate must be a valid number",
    });
  } else if (annualRate < 5) {
    errors.push({
      field: "annualRate",
      value: annualRate,
      min: 5,
      message: "Annual rate must be at least 5%",
    });
  } else if (annualRate > 35) {
    errors.push({
      field: "annualRate",
      value: annualRate,
      max: 35,
      message: "Annual rate cannot exceed 35%",
    });
  }

  // Validate number of months
  if (typeof numberOfMonths !== "number" || isNaN(numberOfMonths) || !Number.isInteger(numberOfMonths)) {
    errors.push({
      field: "numberOfMonths",
      value: numberOfMonths,
      message: "Number of months must be a valid integer",
    });
  } else if (numberOfMonths < 24) {
    errors.push({
      field: "numberOfMonths",
      value: numberOfMonths,
      min: 24,
      message: "Loan term must be at least 24 months",
    });
  } else if (numberOfMonths > 84) {
    errors.push({
      field: "numberOfMonths",
      value: numberOfMonths,
      max: 84,
      message: "Loan term cannot exceed 84 months",
    });
  }

  return errors;
}

/**
 * Generates complete amortization schedule
 * @private
 */
function generateAmortizationSchedule(
  principal: number,
  monthlyRate: number,
  monthlyPayment: number,
  numberOfMonths: number
): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];
  let remainingBalance = principal;

  for (let month = 1; month <= numberOfMonths; month++) {
    // Calculate interest for this month
    const interestPayment = remainingBalance * monthlyRate;

    // Calculate principal portion
    const principalPayment = monthlyPayment - interestPayment;

    // Update balance
    remainingBalance -= principalPayment;

    // Handle final month rounding
    const finalBalance = month === numberOfMonths ? 0 : remainingBalance;

    schedule.push({
      month,
      payment: monthlyPayment,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      balance: Math.round(finalBalance * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Get payment summary (for quick lookups without full schedule)
 */
export function getPaymentSummary(
  principal: number,
  annualRate: number,
  numberOfMonths: number
): { monthlyPayment: number; totalInterest: number } {
  const result = calculateMonthlyPayment(principal, annualRate, numberOfMonths);
  return {
    monthlyPayment: result.monthlyPayment,
    totalInterest: result.totalInterest,
  };
}


interface ValidationError {
  field: string;
  value: number;
  min?: number;
  max?: number;
  message: string;
}
