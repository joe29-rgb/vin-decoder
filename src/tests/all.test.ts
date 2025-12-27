/**
 * COMPREHENSIVE UNIT TESTS
 */

import { calculateMonthlyPayment } from '../modules/payment-calculator';
import { getLenderProgram } from '../modules/lender-programs';
import { calculateTradeInEquity } from '../modules/trade-in-equity';
import { validateCompliance } from '../modules/compliance-validator';
import { recommendBundles } from '../modules/aftermarket-products';
import { calculateTaxSavings } from '../modules/tax-calculator';

describe('Finance-in-a-Box Test Suite', () => {
  describe('Payment Calculator', () => {
    test('should calculate payment correctly: $20,199 @ 21.99% / 84m', () => {
      const result = calculateMonthlyPayment(20199, 21.99, 84);
      expect(result.monthlyPayment).toBe(475);
    });

    test('should calculate payment correctly: $10,000 @ 11.99% / 60m', () => {
      const result = calculateMonthlyPayment(10000, 11.99, 60);
      expect(result.monthlyPayment).toBe(220);
    });

    test('should validate principal range', () => {
      expect(() => calculateMonthlyPayment(5000, 15, 60)).toThrow();
      expect(() => calculateMonthlyPayment(150000, 15, 60)).toThrow();
    });

    test('should generate amortization schedule', () => {
      const result = calculateMonthlyPayment(10000, 15, 24);
      expect(result.amortizationSchedule.length).toBe(24);
      expect(result.amortizationSchedule[result.amortizationSchedule.length-1].balance).toBe(0);
    });
  });

  describe('Lender Programs', () => {
    test('should retrieve TD 2-Key program', () => {
      const program = getLenderProgram('TD', '2-Key');
      expect(program?.rate).toBe(11.99);
      expect(program?.ltv).toBe(140);
    });

    test('should retrieve Santander Tier 8', () => {
      const program = getLenderProgram('Santander', 'Tier8');
      expect(program?.rate).toBe(11.49);
      expect(program?.ltv).toBe(165);
    });

    test('should retrieve SDA Star 3', () => {
      const program = getLenderProgram('SDA', 'Star3');
      expect(program?.rate).toBe(21.99);
      expect(program?.ltv).toBe(140);
    });
  });

  describe('Trade-In Equity', () => {
    test('should calculate positive equity', () => {
      const result = calculateTradeInEquity(15000, 9000, 'TD', '2-Key');
      expect(result.type).toBe('positive');
      expect(result.equityAmount).toBe(6000);
    });

    test('should handle negative equity under limit', () => {
      const result = calculateTradeInEquity(8000, 9500, 'TD', '2-Key');
      expect(result.type).toBe('negative');
      expect(result.canRollover).toBe(true);
    });
  });

  describe('Compliance', () => {
    test('should pass compliant deal', () => {
      const result = validateCompliance(380, 5200, 19500, 19500, 'SDA', 'Star3');
      expect(result.overall).toBe(true);
    });
  });

  describe('Tax Calculator', () => {
    test('should calculate Alberta tax (5%)', () => {
      const result = calculateTaxSavings(22500, 8000, 'AB' as any);
      expect(result.taxRate).toBe(0.05);
    });

    test('should calculate Ontario tax (13%)', () => {
      const result = calculateTaxSavings(22500, 8000, 'ON' as any);
      expect(result.taxRate).toBe(0.13);
    });
  });
});
