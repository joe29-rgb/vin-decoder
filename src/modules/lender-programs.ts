/**
 * MODULE 2: LENDER PROGRAMS DATABASE
 * TD Auto Finance - Complete Program Implementation
 * Based on official January 2026 documentation
 * 
 * PROGRAMS:
 * 1. Specialized Lending (2-6 Key) - Non-Prime/Subprime
 * 2. Holiday Special - Prime (Dec 16, 2025 - Jan 18, 2026)
 * 3. Eco Program - Prime (Hybrid/Electric)
 * 4. Standard Fixed Rates - Prime (2015-2026)
 */

import { LenderProgram, LenderType } from '../types/types';

/**
 * Calculate TD reserve based on amount financed
 * Base Reserve Grid (applies to all TD programs):
 * $40,000+: $700
 * $25,000-$39,999: $600
 * $20,000-$24,999: $500
 * $15,000-$19,999: $400
 * $10,000-$14,999: $300
 * $7,500-$9,999: $200
 */
export function calculateTDReserve(amountFinanced: number): number {
  if (amountFinanced >= 40000) return 700;
  if (amountFinanced >= 25000) return 600;
  if (amountFinanced >= 20000) return 500;
  if (amountFinanced >= 15000) return 400;
  if (amountFinanced >= 10000) return 300;
  if (amountFinanced >= 7500) return 200;
  return 0;
}

/**
 * Get TD/SDA subvented rate for new FCA vehicles (2024-2026)
 * Returns subvented rate if applicable, otherwise returns null (use standard rate)
 * 
 * @param lender - 'TD' or 'SDA'
 * @param program - e.g., '5-Key', 'Star 5'
 * @param vehicleYear - Model year
 * @param vehicleMake - Manufacturer (Chrysler, Dodge, Jeep, Ram)
 * @param amountFinanced - Amount being financed
 * @returns Subvented APR or null if not applicable
 */
export function getSubventedRate(
  lender: string,
  program: string,
  vehicleYear: number,
  vehicleMake: string,
  amountFinanced: number
): number | null {
  // Only for new 2024-2026 vehicles
  if (vehicleYear < 2024 || vehicleYear > 2026) return null;
  
  // Only for FCA brands
  const fcaBrands = ['chrysler', 'dodge', 'jeep', 'ram'];
  const makeNorm = (vehicleMake || '').toLowerCase().trim();
  if (!fcaBrands.includes(makeNorm)) return null;
  
  // Only for TD and SDA
  const lenderNorm = (lender || '').toLowerCase().trim();
  if (!lenderNorm.includes('td') && !lenderNorm.includes('sda') && !lenderNorm.includes('scotia')) return null;
  
  // Parse program tier (e.g., "5-Key" -> 5, "Star 5" -> 5)
  const programNorm = (program || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let tier = 0;
  const keyMatch = programNorm.match(/(\d+)key|key(\d+)/);
  const starMatch = programNorm.match(/(\d+)star|star(\d+)/);
  if (keyMatch) tier = parseInt(keyMatch[1] || keyMatch[2]);
  if (starMatch) tier = parseInt(starMatch[1] || starMatch[2]);
  
  // Only tiers 3-6 have subvented rates
  if (tier < 3 || tier > 6) return null;
  
  // Subvented rate grid from FCA Canada documentation
  // Rates are the same across all amount financed brackets for simplicity
  const isTD = lenderNorm.includes('td');
  const isSDA = lenderNorm.includes('sda') || lenderNorm.includes('scotia');
  
  if (isTD) {
    // TD KEY programs
    if (tier === 6) return 8.99;  // KEY 6: 8.99% or 11.99%
    if (tier === 5) return 7.99;  // KEY 5: 7.99%, 11.99%, or 16.99%
    if (tier === 4) return 16.99; // KEY 4: 16.99%
    if (tier === 3) return 20.09; // KEY 3: 20.09%
  }
  
  if (isSDA) {
    // SDA STAR programs
    if (tier === 6) return 8.99;  // STAR 6: 8.99%, 11.99%, or 16.99%
    if (tier === 5) return 7.99;  // STAR 5: 7.99%, 11.99%, or 16.99%
    if (tier === 4) return 16.99; // STAR 4: 16.99%
    if (tier === 3) return 20.09; // STAR 3: 20.09%
  }
  
  return null;
}

/**
 * Calculate TD Prime reserve percentage based on rate, term, and amount financed
 * Returns percentage (e.g., 0.0115 for 1.15%)
 */
export function calculateTDPrimeReservePercent(
  rate: number,
  termMonths: number,
  amountFinanced: number
): number {
  // Rate-based reserve grid from Holiday Special/Eco/Standard programs
  const reserveGrid: Record<number, Record<number, Record<string, number>>> = {
    // 48-78 month terms
    48: {
      6.89: { '100k+': 0.0030, '50k-99k': 0.0030, '40k-49k': 0.0020, '30k-39k': 0.0015 },
      7.39: { '100k+': 0.0060, '50k-99k': 0.0050, '40k-49k': 0.0050, '30k-39k': 0.0030 },
      7.89: { '100k+': 0.0115, '50k-99k': 0.0115, '40k-49k': 0.0100, '30k-39k': 0.0080, '20k-29k': 0.0025 },
      8.39: { '100k+': 0.0170, '50k-99k': 0.0170, '40k-49k': 0.0140, '30k-39k': 0.0085, '20k-29k': 0.0050 },
      8.89: { '50k-99k': 0.0235, '40k-49k': 0.0215, '30k-39k': 0.0180, '20k-29k': 0.0100, '7.5k-19k': 0.0010 },
      9.39: { '40k-49k': 0.0290, '30k-39k': 0.0235, '20k-29k': 0.0145, '7.5k-19k': 0.0060 },
    },
    // 84 month terms
    84: {
      6.89: { '100k+': 0.0035, '50k-99k': 0.0035, '40k-49k': 0.0025, '30k-39k': 0.0020 },
      7.39: { '100k+': 0.0060, '50k-99k': 0.0050, '40k-49k': 0.0050, '30k-39k': 0.0020 },
      7.89: { '100k+': 0.0120, '50k-99k': 0.0115, '40k-49k': 0.0100, '30k-39k': 0.0080, '20k-29k': 0.0025 },
      8.39: { '100k+': 0.0145, '50k-99k': 0.0135, '40k-49k': 0.0110, '30k-39k': 0.0075, '20k-29k': 0.0040 },
      8.89: { '50k-99k': 0.0165, '40k-49k': 0.0150, '30k-39k': 0.0095, '20k-29k': 0.0050, '7.5k-19k': 0.0010 },
      9.39: { '40k-49k': 0.0210, '30k-39k': 0.0160, '20k-29k': 0.0085, '7.5k-19k': 0.0050 },
    },
    // 90-96 month terms
    90: {
      7.39: { '100k+': 0.0050, '50k-99k': 0.0050, '40k-49k': 0.0040, '30k-39k': 0.0020 },
      7.89: { '100k+': 0.0110, '50k-99k': 0.0100, '40k-49k': 0.0080, '30k-39k': 0.0050 },
    },
  };

  // Determine term bucket
  let termBucket = 48;
  if (termMonths >= 90) termBucket = 90;
  else if (termMonths >= 84) termBucket = 84;

  // Determine amount bucket
  let amountBucket = '7.5k-19k';
  if (amountFinanced >= 100000) amountBucket = '100k+';
  else if (amountFinanced >= 50000) amountBucket = '50k-99k';
  else if (amountFinanced >= 40000) amountBucket = '40k-49k';
  else if (amountFinanced >= 30000) amountBucket = '30k-39k';
  else if (amountFinanced >= 20000) amountBucket = '20k-29k';

  // Find closest rate
  const termGrid = reserveGrid[termBucket];
  if (!termGrid) return 0;

  const rateGrid = termGrid[rate];
  if (!rateGrid) return 0;

  return rateGrid[amountBucket] || 0;
}

const LENDER_PROGRAMS: Record<string, Record<string, LenderProgram>> = {
  TD: {
    // ========================================
    // SPECIALIZED LENDING (NON-PRIME/SUBPRIME)
    // 2-6 Key Programs
    // Effective: December 1, 2025
    // ========================================
    '2-Key': {
      lender: 'TD',
      tier: '2-Key',
      rate: 27.0,
      ltv: 140, // Used: 140%, New 2024-2026: 125%
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0, // Dynamic - calculated via calculateTDReserve()
      fee: 799,
      negativeEquityLimit: 2000,
    },
    '3-Key': {
      lender: 'TD',
      tier: '3-Key',
      rate: 21.5,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0, // Dynamic
      fee: 799,
      negativeEquityLimit: 2000,
    },
    '4-Key': {
      lender: 'TD',
      tier: '4-Key',
      rate: 17.5,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0, // Dynamic
      fee: 799,
      negativeEquityLimit: 2000,
    },
    '5-Key': {
      lender: 'TD',
      tier: '5-Key',
      rate: 14.5,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0, // Dynamic
      fee: 799,
      negativeEquityLimit: 2000,
    },
    '6-Key': {
      lender: 'TD',
      tier: '6-Key',
      rate: 11.99,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0, // Dynamic
      fee: 799,
      negativeEquityLimit: 2000,
    },

    // ========================================
    // PRIME PROGRAMS
    // Holiday Special, Eco, Standard Fixed Rates
    // Rates: 6.49% - 11.9%
    // ========================================
    'Prime-6.49': {
      lender: 'TD',
      tier: 'Prime-6.49',
      rate: 6.49,
      ltv: 140, // Same as specialized
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0, // Dynamic percentage-based
      fee: 0, // No fee for Prime
      negativeEquityLimit: 0,
    },
    'Prime-6.89': {
      lender: 'TD',
      tier: 'Prime-6.89',
      rate: 6.89,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-7.39': {
      lender: 'TD',
      tier: 'Prime-7.39',
      rate: 7.39,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-7.89': {
      lender: 'TD',
      tier: 'Prime-7.89',
      rate: 7.89,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-8.39': {
      lender: 'TD',
      tier: 'Prime-8.39',
      rate: 8.39,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-8.89': {
      lender: 'TD',
      tier: 'Prime-8.89',
      rate: 8.89,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-9.39': {
      lender: 'TD',
      tier: 'Prime-9.39',
      rate: 9.39,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-9.89': {
      lender: 'TD',
      tier: 'Prime-9.89',
      rate: 9.89,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-10.39': {
      lender: 'TD',
      tier: 'Prime-10.39',
      rate: 10.39,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-10.89': {
      lender: 'TD',
      tier: 'Prime-10.89',
      rate: 10.89,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-11.39': {
      lender: 'TD',
      tier: 'Prime-11.39',
      rate: 11.39,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
    'Prime-11.9': {
      lender: 'TD',
      tier: 'Prime-11.9',
      rate: 11.9,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 0,
    },
  },
  Santander: {
    'Tier8': {
      lender: 'Santander',
      tier: 'Tier8',
      rate: 11.49,
      ltv: 165,
      maxDsr: 30,
      minIncome: 2500,
      reserve: 600,
      fee: 0,
      negativeEquityLimit: 5000,
    },
    'Tier7': {
      lender: 'Santander',
      tier: 'Tier7',
      rate: 13.49,
      ltv: 165,
      maxDsr: 30,
      minIncome: 2500,
      reserve: 600,
      fee: 0,
      negativeEquityLimit: 5000,
    },
    'Tier6': {
      lender: 'Santander',
      tier: 'Tier6',
      rate: 16.49,
      ltv: 165,
      maxDsr: 30,
      minIncome: 2500,
      reserve: 550,
      fee: 0,
      negativeEquityLimit: 4000,
    },
    'Tier5': {
      lender: 'Santander',
      tier: 'Tier5',
      rate: 21.99,
      ltv: 165,
      maxDsr: 30,
      minIncome: 2500,
      reserve: 550,
      fee: 0,
      negativeEquityLimit: 3500,
    },
    'Tier4': {
      lender: 'Santander',
      tier: 'Tier4',
      rate: 24.49,
      ltv: 165,
      maxDsr: 30,
      minIncome: 2500,
      reserve: 550,
      fee: 0,
      negativeEquityLimit: 3500,
    },
    'Tier3': {
      lender: 'Santander',
      tier: 'Tier3',
      rate: 26.24,
      ltv: 165,
      maxDsr: 30,
      minIncome: 2500,
      reserve: 525,
      fee: 0,
      negativeEquityLimit: 3000,
    },
    'Tier2': {
      lender: 'Santander',
      tier: 'Tier2',
      rate: 29.99,
      ltv: 165,
      maxDsr: 30,
      minIncome: 2500,
      reserve: 750,
      fee: 0,
      negativeEquityLimit: 3000,
    },
    'Tier1': {
      lender: 'Santander',
      tier: 'Tier1',
      rate: 31.9,
      ltv: 165,
      maxDsr: 30,
      minIncome: 2500,
      reserve: 500,
      fee: 0,
      negativeEquityLimit: 3000,
    },
  },
  SDA: {
    'Star7': {
      lender: 'SDA',
      tier: 'Star7',
      rate: 11.99,
      ltv: 180,
      maxDsr: 65,
      minIncome: 1750,
      reserve: 600,
      fee: 399,
      negativeEquityLimit: 5000,
      rateUpsell: 2,
    },
    'Star6': {
      lender: 'SDA',
      tier: 'Star6',
      rate: 13.49,
      ltv: 180,
      maxDsr: 60,
      minIncome: 1750,
      reserve: 600,
      fee: 699,
      negativeEquityLimit: 5000,
      rateUpsell: 2,
    },
    'Star5': {
      lender: 'SDA',
      tier: 'Star5',
      rate: 14.49,
      ltv: 160,
      maxDsr: 55,
      minIncome: 1750,
      reserve: 500,
      fee: 699,
      negativeEquityLimit: 5000,
      rateUpsell: 2,
    },
    'Star4': {
      lender: 'SDA',
      tier: 'Star4',
      rate: 18.49,
      ltv: 150,
      maxDsr: 55,
      minIncome: 1750,
      reserve: 300,
      fee: 699,
      negativeEquityLimit: 4000,
      rateUpsell: 2,
    },
    'Star3': {
      lender: 'SDA',
      tier: 'Star3',
      rate: 21.99,
      ltv: 140,
      maxDsr: 45,
      minIncome: 1750,
      reserve: 400,
      fee: 699,
      negativeEquityLimit: 4000,
      rateUpsell: 2,
    },
    'Star2': {
      lender: 'SDA',
      tier: 'Star2',
      rate: 27.99,
      ltv: 140,
      maxDsr: 45,
      minIncome: 1750,
      reserve: 300,
      fee: 799,
      negativeEquityLimit: 3000,
      rateUpsell: 2,
    },
    'Star1': {
      lender: 'SDA',
      tier: 'Star1',
      rate: 29.99,
      ltv: 140,
      maxDsr: 45,
      minIncome: 1750,
      reserve: 100,
      fee: 799,
      negativeEquityLimit: 3000,
      rateUpsell: 2,
    },
    'StartRight': {
      lender: 'SDA',
      tier: 'StartRight',
      rate: 15.49,
      ltv: 140,
      maxDsr: 65,
      minIncome: 1750,
      reserve: 300,
      fee: 599,
      negativeEquityLimit: 5000,
      rateUpsell: 2,
    },
  },
  AutoCapital: {
    'Tier1': {
      lender: 'AutoCapital',
      tier: 'Tier1',
      rate: 13.49,
      ltv: 140,
      maxDsr: 55,
      minIncome: 1800,
      reserve: 500,
      fee: 799,
      negativeEquityLimit: 5000,
    },
    'Tier2': {
      lender: 'AutoCapital',
      tier: 'Tier2',
      rate: 14.49,
      ltv: 140,
      maxDsr: 55,
      minIncome: 1800,
      reserve: 500,
      fee: 799,
      negativeEquityLimit: 5000,
    },
    'Tier3': {
      lender: 'AutoCapital',
      tier: 'Tier3',
      rate: 15.99,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 500,
      fee: 799,
      negativeEquityLimit: 4000,
    },
    'Tier4': {
      lender: 'AutoCapital',
      tier: 'Tier4',
      rate: 17.99,
      ltv: 135,
      maxDsr: 47,
      minIncome: 1800,
      reserve: 500,
      fee: 799,
      negativeEquityLimit: 4000,
    },
    'Tier5': {
      lender: 'AutoCapital',
      tier: 'Tier5',
      rate: 21.49,
      ltv: 135,
      maxDsr: 43,
      minIncome: 1800,
      reserve: 500,
      fee: 799,
      negativeEquityLimit: 3000,
    },
    'Tier6': {
      lender: 'AutoCapital',
      tier: 'Tier6',
      rate: 23.49,
      ltv: 130,
      maxDsr: 43,
      minIncome: 1800,
      reserve: 500,
      fee: 799,
      negativeEquityLimit: 3000,
    },
  },
  EdenPark: {
    '6Ride': {
      lender: 'EdenPark',
      tier: '6Ride',
      rate: 11.99,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 750,
      fee: 0,
      negativeEquityLimit: 5000,
    },
    '5Ride': {
      lender: 'EdenPark',
      tier: '5Ride',
      rate: 13.99,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 750,
      fee: 0,
      negativeEquityLimit: 5000,
    },
    '4Ride': {
      lender: 'EdenPark',
      tier: '4Ride',
      rate: 16.99,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 750,
      fee: 0,
      negativeEquityLimit: 4000,
    },
    '3Ride': {
      lender: 'EdenPark',
      tier: '3Ride',
      rate: 19.99,
      ltv: 135,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 750,
      fee: 0,
      negativeEquityLimit: 4000,
    },
    '2Ride': {
      lender: 'EdenPark',
      tier: '2Ride',
      rate: 23.99,
      ltv: 130,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 750,
      fee: 0,
      negativeEquityLimit: 3000,
    },
  },
  IAAutoFinance: {
    '6thGear': {
      lender: 'IAAutoFinance',
      tier: '6thGear',
      rate: 11.49,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 1000,
      fee: 699,
      negativeEquityLimit: 5000,
    },
    '5thGear': {
      lender: 'IAAutoFinance',
      tier: '5thGear',
      rate: 15.49,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 1000,
      fee: 699,
      negativeEquityLimit: 5000,
    },
    '4thGear': {
      lender: 'IAAutoFinance',
      tier: '4thGear',
      rate: 20.49,
      ltv: 135,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 1000,
      fee: 699,
      negativeEquityLimit: 4000,
    },
    '3rdGear': {
      lender: 'IAAutoFinance',
      tier: '3rdGear',
      rate: 25.49,
      ltv: 125,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 1000,
      fee: 699,
      negativeEquityLimit: 3000,
    },
    '2ndGear': {
      lender: 'IAAutoFinance',
      tier: '2ndGear',
      rate: 29.99,
      ltv: 125,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 1000,
      fee: 699,
      negativeEquityLimit: 3000,
    },
    '1stGear': {
      lender: 'IAAutoFinance',
      tier: '1stGear',
      rate: 29.99,
      ltv: 110,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 1000,
      fee: 699,
      negativeEquityLimit: 2000,
    },
  },
  LendCare: {
    'Tier1': {
      lender: 'LendCare',
      tier: 'Tier1',
      rate: 18.9,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 799,
      fee: 0,
      negativeEquityLimit: 5000,
    },
    'Tier2': {
      lender: 'LendCare',
      tier: 'Tier2',
      rate: 27.9,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 599,
      fee: 0,
      negativeEquityLimit: 3000,
    },
    'Tier3': {
      lender: 'LendCare',
      tier: 'Tier3',
      rate: 29.9,
      ltv: 110,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 399,
      fee: 0,
      negativeEquityLimit: 2000,
    },
  },
  Northlake: {
    'Titanium': {
      lender: 'Northlake',
      tier: 'Titanium',
      rate: 10.99,
      ltv: 140,
      maxDsr: 20,
      minIncome: 1800,
      reserve: 600,
      fee: 0,
      negativeEquityLimit: 5000,
    },
    'Platinum': {
      lender: 'Northlake',
      tier: 'Platinum',
      rate: 10.99,
      ltv: 140,
      maxDsr: 20,
      minIncome: 1800,
      reserve: 600,
      fee: 0,
      negativeEquityLimit: 5000,
    },
    'Gold': {
      lender: 'Northlake',
      tier: 'Gold',
      rate: 13.99,
      ltv: 135,
      maxDsr: 18,
      minIncome: 1800,
      reserve: 450,
      fee: 0,
      negativeEquityLimit: 4000,
    },
    'Standard': {
      lender: 'Northlake',
      tier: 'Standard',
      rate: 17.99,
      ltv: 125,
      maxDsr: 17,
      minIncome: 1800,
      reserve: 300,
      fee: 0,
      negativeEquityLimit: 3000,
    },
    'UDrive': {
      lender: 'Northlake',
      tier: 'UDrive',
      rate: 22.99,
      ltv: 120,
      maxDsr: 15,
      minIncome: 1800,
      reserve: 0,
      fee: 0,
      negativeEquityLimit: 2000,
    },
  },
  RIFCO: {
    'PreferredTier1': {
      lender: 'RIFCO',
      tier: 'PreferredTier1',
      rate: 12.95,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 600,
      fee: 395,
      negativeEquityLimit: 5000,
    },
    'PreferredTier2': {
      lender: 'RIFCO',
      tier: 'PreferredTier2',
      rate: 14.95,
      ltv: 135,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 500,
      fee: 395,
      negativeEquityLimit: 5000,
    },
    'PreferredTier3': {
      lender: 'RIFCO',
      tier: 'PreferredTier3',
      rate: 19.95,
      ltv: 135,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 400,
      fee: 395,
      negativeEquityLimit: 4000,
    },
    'PreferredTier4': {
      lender: 'RIFCO',
      tier: 'PreferredTier4',
      rate: 24.95,
      ltv: 130,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 0,
      fee: 395,
      negativeEquityLimit: 3000,
    },
    'PreferredTier5': {
      lender: 'RIFCO',
      tier: 'PreferredTier5',
      rate: 29.95,
      ltv: 125,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 300,
      fee: 395,
      negativeEquityLimit: 3000,
    },
    'Standard': {
      lender: 'RIFCO',
      tier: 'Standard',
      rate: 29.95,
      ltv: 130,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 250,
      fee: 395,
      negativeEquityLimit: 3000,
    },
  },
};

export function getLenderProgram(lender: LenderType, tier: string): LenderProgram | null {
  return LENDER_PROGRAMS[lender]?.[tier] || null;
}

export function getLenderTiers(lender: LenderType): string[] {
  return Object.keys(LENDER_PROGRAMS[lender] || {});
}

export function getAllLenderPrograms(): Record<string, Record<string, LenderProgram>> {
  return LENDER_PROGRAMS;
}

export function getBaseReserve(program: LenderProgram): number {
  return program.reserve;
}
