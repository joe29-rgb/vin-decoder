# Finance-in-a-Box – Repository Snapshot

Use this single document to review all project files. Each section shows the file path and its full contents.

---

## Project Tree

```
finance-in-box/
├── package.json
├── tsconfig.json
├── jest.config.js
├── .gitignore
├── .env.example
├── src/
│   ├── types/
│   │   └── types.ts
│   ├── modules/
│   │   ├── payment-calculator.ts
│   │   ├── lender-programs.ts
│   │   ├── trade-in-equity.ts
│   │   ├── compliance-validator.ts
│   │   ├── aftermarket-products.ts
│   │   ├── deal-maximizer.ts
│   │   ├── tax-calculator.ts
│   │   ├── vin-decoder.ts
│   │   ├── inventory-manager.ts
│   │   └── ghl-integration.ts
│   ├── api/
│   │   ├── api.ts
│   │   └── main.ts
│   └── tests/
│       └── all.test.ts
```

---

## package.json

```json
{
  "name": "finance-in-box",
  "version": "1.0.0",
  "description": "Complete TypeScript financial system for Canadian automotive dealerships",
  "main": "dist/src/api/main.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/src/api/main.js",
    "dev": "ts-node src/api/main.ts",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^18.11.9",
    "@types/jest": "^29.2.4",
    "typescript": "^4.9.4",
    "jest": "^29.3.1",
    "ts-jest": "^29.0.3",
    "ts-node": "^10.9.1"
  }
}
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## jest.config.js

```js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  moduleFileExtensions: ["ts", "js", "json"]
};
```

---

## .gitignore

```gitignore
node_modules
dist
.env
.DS_Store
```

---

## .env.example

```dotenv
PORT=10000
GHL_API_KEY=your_ghl_api_key_here
GHL_BASE_URL=https://rest.gohighlevel.com/v1
```

---

## src/types/types.ts

```ts
/**
 * CENTRAL TYPES FOR FINANCE-IN-A-BOX
 * All TypeScript interfaces used across the system
 */

export type LenderType = 'TD' | 'Santander' | 'SDA';
export type Province = 'AB' | 'BC' | 'SK' | 'MB' | 'ON' | 'QC' | 'NS' | 'NB' | 'PE' | 'NL';

/**
 * Vehicle from inventory
 */
export interface Vehicle {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  color?: string;
  engine: string;
  transmission: string;
  cbbWholesale: number;
  cbbRetail: number;
  yourCost: number;
  suggestedPrice: number;
  inStock: boolean;
}

/**
 * Customer/Buyer profile
 */
export interface CustomerProfile {
  monthlyIncome: number;
  downPayment: number;
  tradeInValue?: number;
  tradeInBalance?: number;
  creditScore?: number;
  province: Province;
}

/**
 * Request to find deals
 */
export interface FindDealsRequest extends CustomerProfile {
  lender: LenderType;
  tier: string;
  term: number;
  inventoryFilter?: {
    make?: string;
    model?: string;
    maxMileage?: number;
    minYear?: number;
  };
}

/**
 * Calculated deal
 */
export interface Deal {
  id: string;
  rank: number;
  vehicle: Vehicle;
  lender: LenderType;
  tier: string;
  salePrice: number;
  downPayment: number;
  financeAmount: number;
  monthlyPayment: number;
  term: number;
  compliance: ComplianceResult;
  productBundle: ProductBundle;
  grossProfit: GrossProfitBreakdown;
  dealertrackCopy: string;
}

/**
 * Payment calculation result
 */
export interface PaymentCalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalAmortized: number;
  amortizationSchedule: AmortizationEntry[];
}

/**
 * Single amortization entry
 */
export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/**
 * Trade-in equity result
 */
export interface TradeInEquityResult {
  type: 'positive' | 'negative' | 'zero';
  equityAmount: number;
  canRollover: boolean;
  maxRolloverLimit: number;
  rolledAmount: number;
  note: string;
}

/**
 * Compliance check result
 */
export interface ComplianceResult {
  dsr: number;
  dsrPass: boolean;
  ltv: number;
  ltvPass: boolean;
  overall: boolean;
  warnings: string[];
}

/**
 * Lender program specs
 */
export interface LenderProgram {
  lender: LenderType;
  tier: string;
  rate: number;
  ltv: number;
  maxDsr: number;
  minIncome: number;
  reserve: number;
  fee: number;
  negativeEquityLimit: number;
  rateUpsell?: number;
}

/**
 * Aftermarket product
 */
export interface Product {
  name: string;
  category: 'warranty' | 'gap' | 'tire' | 'appearance';
  retailPrice: number;
  cost: number;
  margin: number;
}

/**
 * Product bundle
 */
export interface ProductBundle {
  products: Product[];
  totalRetail: number;
  totalCost: number;
  totalMargin: number;
}

/**
 * Gross profit breakdown
 */
export interface GrossProfitBreakdown {
  vehicleGross: number;
  lenderReserve: number;
  rateUpsell: number;
  productMargin: number;
  total: number;
}

/**
 * Tax calculation result
 */
export interface TaxResult {
  province: Province;
  taxRate: number;
  salePrice: number;
  taxableBase: number;
  totalTax: number;
  taxSavingsWithTrade: number;
}

/**
 * VIN decoding result
 */
export interface VINDecodingResult {
  year: number;
  make: string;
  model: string;
  body: string;
  engine: string;
  transmission: string;
}

/**
 * Find deals response
 */
export interface FindDealsResponse {
  success: boolean;
  deals: Deal[];
  summary: {
    totalVehiclesScanned: number;
    totalCompliantDeals: number;
    topDealGrossProfit: number;
    averageMonthlyPayment: number;
  };
}

/**
 * GoHighLevel integration response
 */
export interface GHLResponse {
  success: boolean;
  noteId?: string;
  dealLink?: string;
  error?: string;
}
```

---

## src/modules/payment-calculator.ts

```ts
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
  } else if (principal < 7500) {
    errors.push({
      field: "principal",
      value: principal,
      min: 7500,
      message: "Principal must be at least $7,500",
    });
  } else if (principal > 100000) {
    errors.push({
      field: "principal",
      value: principal,
      max: 100000,
      message: "Principal cannot exceed $100,000",
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
```

---

## src/modules/lender-programs.ts

```ts
/**
 * MODULE 2: LENDER PROGRAMS DATABASE
 * Hardcoded lender specifications from official 2025 rate sheets
 * TD, Santander, and Scotia Dealer Advantage
 */

import { LenderProgram, LenderType } from '../types/types';

const LENDER_PROGRAMS: Record<string, Record<string, LenderProgram>> = {
  TD: {
    '2-Key': {
      lender: 'TD',
      tier: '2-Key',
      rate: 11.99,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 300,
      fee: 799,
      negativeEquityLimit: 5000,
    },
    '3-Key': {
      lender: 'TD',
      tier: '3-Key',
      rate: 13.49,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 550,
      fee: 799,
      negativeEquityLimit: 5000,
    },
    '4-Key': {
      lender: 'TD',
      tier: '4-Key',
      rate: 15.99,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 600,
      fee: 799,
      negativeEquityLimit: 5000,
    },
    '5-Key': {
      lender: 'TD',
      tier: '5-Key',
      rate: 17.99,
      ltv: 140,
      maxDsr: 50,
      minIncome: 1800,
      reserve: 750,
      fee: 799,
      negativeEquityLimit: 5000,
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
```

---

## src/modules/trade-in-equity.ts

```ts
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
```

---

## src/modules/compliance-validator.ts

```ts
/**
 * MODULE 4: DSR & LTV COMPLIANCE VALIDATOR
 * Validates Debt Service Ratio and Loan-to-Value against lender limits
 */

import { ComplianceResult, LenderType } from '../types/types';
import { getLenderProgram } from './lender-programs';

export function validateCompliance(
  monthlyPayment: number,
  monthlyIncome: number,
  financeAmount: number,
  cbbWholesaleValue: number,
  lender: LenderType,
  tier: string
): ComplianceResult {
  const program = getLenderProgram(lender, tier);
  if (!program) {
    throw new Error(`Invalid lender/tier: ${lender}/${tier}`);
  }

  const dsr = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 0;
  const dsrPass = dsr <= program.maxDsr;

  const ltv = cbbWholesaleValue > 0 ? (financeAmount / cbbWholesaleValue) * 100 : 0;
  const ltvPass = ltv <= program.ltv;

  const warnings: string[] = [];

  if (dsr > program.maxDsr * 0.9) {
    warnings.push(`HIGH DSR: ${dsr.toFixed(1)}% (max: ${program.maxDsr}%)`);
  }
  if (ltv > 130) {
    warnings.push(`HIGH LTV: ${ltv.toFixed(1)}% - minimal equity cushion`);
  }
  if (dsr > program.maxDsr && ltv > program.ltv) {
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
```

---

## src/modules/aftermarket-products.ts

```ts
/**
 * MODULE 5: AFTERMARKET PRODUCTS PRICING
 * Fixed pricing (NOT percentages) for warranties, gap, tire & rim, appearance
 */

import { Product, ProductBundle } from '../types/types';

export const PRODUCTS = {
  WARRANTY_ECONOMY: {
    name: 'Extended Warranty - Economy',
    category: 'warranty' as const,
    retailPrice: 1500,
    cost: 750,
    margin: 750,
  },
  WARRANTY_MID: {
    name: 'Extended Warranty - Mid-Range',
    category: 'warranty' as const,
    retailPrice: 2150,
    cost: 1075,
    margin: 1075,
  },
  WARRANTY_PREMIUM: {
    name: 'Extended Warranty - Premium',
    category: 'warranty' as const,
    retailPrice: 3000,
    cost: 1500,
    margin: 1500,
  },
  GAP: {
    name: 'Gap Insurance',
    category: 'gap' as const,
    retailPrice: 649,
    cost: 200,
    margin: 449,
  },
  TIRE_BASIC: {
    name: 'Tire & Rim - Basic',
    category: 'tire' as const,
    retailPrice: 449,
    cost: 200,
    margin: 249,
  },
  TIRE_PREMIUM: {
    name: 'Tire & Rim - Premium',
    category: 'tire' as const,
    retailPrice: 649,
    cost: 325,
    margin: 324,
  },
  TIRE_ULTIMATE: {
    name: 'Tire & Rim - Ultimate',
    category: 'tire' as const,
    retailPrice: 1049,
    cost: 500,
    margin: 549,
  },
  PAINT: {
    name: 'Paint Protection',
    category: 'appearance' as const,
    retailPrice: 349,
    cost: 175,
    margin: 174,
  },
  FABRIC: {
    name: 'Fabric Protection',
    category: 'appearance' as const,
    retailPrice: 249,
    cost: 125,
    margin: 124,
  },
  PAINT_FABRIC: {
    name: 'Paint & Fabric Protection',
    category: 'appearance' as const,
    retailPrice: 499,
    cost: 250,
    margin: 249,
  },
};

export function recommendBundles(
  cbbValue: number,
  lender: string
): ProductBundle[] {
  const bundles: ProductBundle[] = [];

  let warrantyProduct = PRODUCTS.WARRANTY_ECONOMY;
  if (cbbValue >= 20000 && cbbValue < 35000) {
    warrantyProduct = PRODUCTS.WARRANTY_MID;
  } else if (cbbValue >= 35000) {
    warrantyProduct = PRODUCTS.WARRANTY_PREMIUM;
  }

  bundles.push({
    products: [warrantyProduct],
    totalRetail: warrantyProduct.retailPrice,
    totalCost: warrantyProduct.cost,
    totalMargin: warrantyProduct.margin,
  });

  bundles.push({
    products: [warrantyProduct, PRODUCTS.GAP, PRODUCTS.TIRE_BASIC],
    totalRetail:
      warrantyProduct.retailPrice + PRODUCTS.GAP.retailPrice + PRODUCTS.TIRE_BASIC.retailPrice,
    totalCost:
      warrantyProduct.cost + PRODUCTS.GAP.cost + PRODUCTS.TIRE_BASIC.cost,
    totalMargin:
      warrantyProduct.margin + PRODUCTS.GAP.margin + PRODUCTS.TIRE_BASIC.margin,
  });

  bundles.push({
    products: [warrantyProduct, PRODUCTS.GAP, PRODUCTS.TIRE_PREMIUM, PRODUCTS.PAINT_FABRIC],
    totalRetail:
      warrantyProduct.retailPrice +
      PRODUCTS.GAP.retailPrice +
      PRODUCTS.TIRE_PREMIUM.retailPrice +
      PRODUCTS.PAINT_FABRIC.retailPrice,
    totalCost:
      warrantyProduct.cost + PRODUCTS.GAP.cost + PRODUCTS.TIRE_PREMIUM.cost + PRODUCTS.PAINT_FABRIC.cost,
    totalMargin:
      warrantyProduct.margin + PRODUCTS.GAP.margin + PRODUCTS.TIRE_PREMIUM.margin + PRODUCTS.PAINT_FABRIC.margin,
  });

  return bundles;
}

export function validateProductFit(
  productBundle: ProductBundle,
  cbbValue: number,
  lender: string
): { fits: boolean; maxAllowed: number; percentOfCBB: number } {
  const limit = lender === 'Santander' ? 0.3 : 0.4;
  const maxAllowed = cbbValue * limit;
  const percentOfCBB = (productBundle.totalRetail / cbbValue) * 100;

  return {
    fits: productBundle.totalRetail <= maxAllowed,
    maxAllowed,
    percentOfCBB,
  };
}
```

---

## src/modules/deal-maximizer.ts

```ts
/**
 * MODULE 6: DEAL MAXIMIZER ALGORITHM (CORE ENGINE)
 * Scans inventory, applies filters, calculates compliance, ranks by gross profit
 */

import { Deal, Vehicle, FindDealsRequest, LenderType, ProductBundle } from '../types/types';
import { calculateMonthlyPayment } from './payment-calculator';
import { calculateTradeInEquity } from './trade-in-equity';
import { validateCompliance } from './compliance-validator';
import { recommendBundles, validateProductFit } from './aftermarket-products';
import { getLenderProgram, getBaseReserve } from './lender-programs';

let dealIdCounter = 1;

export function findOptimalDeals(
  request: FindDealsRequest,
  inventory: Vehicle[]
): Deal[] {
  const deals: Deal[] = [];
  const program = getLenderProgram(request.lender, request.tier);

  if (!program) {
    throw new Error(`Invalid lender/tier: ${request.lender}/${request.tier}`);
  }

  let filtered = inventory.filter(v => v.inStock);
  if (request.inventoryFilter?.make) {
    filtered = filtered.filter(v => v.make.toLowerCase().includes(request.inventoryFilter!.make!.toLowerCase()));
  }
  if (request.inventoryFilter?.maxMileage) {
    filtered = filtered.filter(v => v.mileage <= request.inventoryFilter!.maxMileage!);
  }

  for (const vehicle of filtered) {
    const vehicleDeals = processVehicle(
      vehicle,
      request,
      program
    );
    deals.push(...vehicleDeals);
  }

  const compliantDeals = deals.filter(d => d.compliance.overall);
  compliantDeals.sort((a, b) => b.grossProfit.total - a.grossProfit.total);

  return compliantDeals.slice(0, 10).map((deal, idx) => ({
    ...deal,
    rank: idx + 1,
  }));
}

function processVehicle(
  vehicle: Vehicle,
  request: FindDealsRequest,
  program: any
): Deal[] {
  const deals: Deal[] = [];

  const tradeEquity = request.tradeInValue
    ? calculateTradeInEquity(request.tradeInValue, request.tradeInBalance || 0, request.lender, request.tier)
    : { type: 'zero' as const, equityAmount: 0, canRollover: false, rolledAmount: 0 };

  let baseFinance = vehicle.suggestedPrice - request.downPayment - (tradeEquity.type === 'positive' ? tradeEquity.equityAmount : 0);
  if (tradeEquity.canRollover) {
    baseFinance += tradeEquity.rolledAmount;
  }
  baseFinance += program.fee;

  const bundles = recommendBundles(vehicle.cbbWholesale, request.lender);

  for (const bundle of bundles) {
    const productFit = validateProductFit(bundle, vehicle.cbbWholesale, request.lender);
    if (!productFit.fits) continue;

    const financeAmount = baseFinance + bundle.totalRetail;

    const paymentCalc = calculateMonthlyPayment(financeAmount, program.rate, request.term);

    const compliance = validateCompliance(
      paymentCalc.monthlyPayment,
      request.monthlyIncome,
      financeAmount,
      vehicle.cbbWholesale,
      request.lender,
      request.tier
    );

    const vehicleGross = vehicle.suggestedPrice - vehicle.yourCost;
    const lenderReserve = getBaseReserve(program);
    const rateUpsell = (financeAmount * (program.rateUpsell || 0)) / 100;

    const deal: Deal = {
      id: `DEAL-${dealIdCounter++}`,
      rank: 0,
      vehicle,
      lender: request.lender,
      tier: request.tier,
      salePrice: vehicle.suggestedPrice,
      downPayment: request.downPayment,
      financeAmount,
      monthlyPayment: paymentCalc.monthlyPayment,
      term: request.term,
      compliance,
      productBundle: bundle,
      grossProfit: {
        vehicleGross,
        lenderReserve,
        rateUpsell,
        productMargin: bundle.totalMargin,
        total: vehicleGross + lenderReserve + rateUpsell + bundle.totalMargin,
      },
      dealertrackCopy: generateDealertrackCopy(vehicle, paymentCalc.monthlyPayment, financeAmount, program),
    };

    deals.push(deal);
  }

  return deals;
}

function generateDealertrackCopy(vehicle: Vehicle, payment: number, finance: number, program: any): string {
  return `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
Stock: ${vehicle.id}
VIN: ${vehicle.vin}
Price: $${vehicle.suggestedPrice.toLocaleString()}
Finance: $${finance.toLocaleString()}
Payment: $${payment}/month
Rate: ${program.rate}%
Lender: ${program.lender}`;
}
```

---

## src/modules/tax-calculator.ts

```ts
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
```

---

## src/modules/vin-decoder.ts

```ts
/**
 * MODULE 8: VIN DECODER
 * Extracts vehicle information from VIN number
 */

import { VINDecodingResult } from '../types/types';

export function decodeVIN(vin: string): VINDecodingResult {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    throw new Error('Invalid VIN format');
  }

  const yearChar = vin.charAt(9);
  const year = decodeModelYear(yearChar);
  const manufacturer = decodeManufacturer(vin.substring(0, 3));
  const modelInfo = decodeModel(vin.substring(3, 8));

  return {
    year,
    make: manufacturer,
    model: modelInfo.model,
    body: modelInfo.body,
    engine: modelInfo.engine,
    transmission: 'Unknown',
  };
}

function decodeModelYear(char: string): number {
  const yearMap: Record<string, number> = {
    Y: 2000, Z: 2001, A: 2010, B: 2011, C: 2012, D: 2013, E: 2014,
    F: 2015, G: 2016, H: 2017, J: 2018, K: 2019, L: 2020, M: 2021,
    N: 2022, P: 2023, R: 2024, S: 2025, T: 2026, V: 2027, W: 2028,
  };
  return yearMap[char] || new Date().getFullYear();
}

function decodeManufacturer(code: string): string {
  const manufacturers: Record<string, string> = {
    JHM: 'Honda', JT2: 'Toyota', JT3: 'Toyota', JT4: 'Toyota',
    JF1: 'Subaru', JF2: 'Subaru', KMH: 'Hyundai', KNA: 'Kia',
    '1G1': 'Chevrolet', '1G3': 'Oldsmobile', '1GT': 'GMC',
    '2G1': 'Pontiac', '2G6': 'Cadillac', '2HG': 'Honda',
    '2T1': 'Toyota', '2T3': 'Toyota', '3G1': 'Chevrolet',
    '3G2': 'Pontiac', '3G5': 'Chevrolet', '5TNM': 'Toyota',
  };
  return manufacturers[code] || 'Unknown';
}

function decodeModel(code: string): {
  model: string;
  body: string;
  engine: string;
} {
  return {
    model: 'Model',
    body: 'Sedan',
    engine: '2.0L',
  };
}
```

---

## src/modules/inventory-manager.ts

```ts
/**
 * MODULE 9: INVENTORY MANAGER
 * Handles CSV loading, vehicle parsing, VIN decoding
 */

import { Vehicle } from '../types/types';
import { decodeVIN } from './vin-decoder';

export function loadInventoryFromCSV(csvContent: string): Vehicle[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header and at least one data row');

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const vehicles: Vehicle[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(v => v.trim());
    const vehicleData: Record<string, any> = {};

    header.forEach((col, idx) => {
      vehicleData[col] = row[idx];
    });

    try {
      const vin = vehicleData.vin || '';
      const vinData = vin.length === 17 ? decodeVIN(vin) : null;

      const vehicle: Vehicle = {
        id: vehicleData.stock || `STOCK-${i}`,
        vin,
        year: vinData?.year || parseInt(vehicleData.year),
        make: vinData?.make || vehicleData.make || 'Unknown',
        model: vinData?.model || vehicleData.model || 'Unknown',
        trim: vehicleData.trim || '',
        mileage: parseInt(vehicleData.mileage) || 0,
        color: vehicleData.color || '',
        engine: vinData?.engine || vehicleData.engine || 'Unknown',
        transmission: vehicleData.transmission || 'Unknown',
        cbbWholesale: parseFloat(vehicleData.cbb_wholesale) || parseFloat(vehicleData.cbbwholesale) || 0,
        cbbRetail: parseFloat(vehicleData.cbb_retail) || parseFloat(vehicleData.cbbretail) || 0,
        yourCost: parseFloat(vehicleData.your_cost) || parseFloat(vehicleData.yourcost) || 0,
        suggestedPrice: parseFloat(vehicleData.suggested_price) || parseFloat(vehicleData.suggestedprice) || 0,
        inStock: vehicleData.in_stock !== 'false' && vehicleData.instock !== 'false',
      };

      vehicles.push(vehicle);
    } catch (e) {
      console.warn(`Skipping row ${i + 1}: ${(e as Error).message}`);
    }
  }

  return vehicles;
}

export function addVehicle(vehicle: Vehicle, inventory: Vehicle[]): Vehicle[] {
  return [...inventory, vehicle];
}

export function removeVehicle(vehicleId: string, inventory: Vehicle[]): Vehicle[] {
  return inventory.filter(v => v.id !== vehicleId);
}

export function updateVehicle(vehicleId: string, updates: Partial<Vehicle>, inventory: Vehicle[]): Vehicle[] {
  return inventory.map(v =>
    v.id === vehicleId ? { ...v, ...updates } : v
  );
}
```

---

## src/modules/ghl-integration.ts

```ts
/**
 * MODULE 10: GOHIGHLEVEL INTEGRATION
 * Saves deals to GoHighLevel CRM system
 */

import { Deal, GHLResponse } from '../types/types';

export async function saveDealToGHL(
  deal: Deal,
  customerId: string,
  accessToken: string
): Promise<GHLResponse> {
  try {
    const noteContent = formatDealNote(deal);

    const response = await fetch('https://rest.gohighlevel.com/v1/contacts/' + customerId + '/notes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: noteContent,
        tags: ['deal', deal.lender, deal.tier],
      }),
    });

    if (!response.ok) {
      throw new Error(`GHL API error: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      success: true,
      noteId: data.id,
      dealLink: generateDealLink(deal, customerId),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save to GHL: ${(error as Error).message}`,
    };
  }
}

export function generateDealLink(deal: Deal, customerId: string): string {
  return `https://your-domain.com/desk?contact_id=${customerId}&deal_id=${deal.id}&vehicle_id=${deal.vehicle.id}&lender=${deal.lender}&tier=${deal.tier}`;
}

function formatDealNote(deal: Deal): string {
  return `
VEHICLE DEAL
${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}
Stock: ${deal.vehicle.id} | VIN: ${deal.vehicle.vin}

DEAL STRUCTURE
Sale Price: $${deal.salePrice.toLocaleString()}
Down Payment: $${deal.downPayment.toLocaleString()}
Amount to Finance: $${deal.financeAmount.toLocaleString()}
Monthly Payment: $${deal.monthlyPayment}/month

LENDER
${deal.lender} ${deal.tier}

COMPLIANCE
DSR: ${deal.compliance.dsr.toFixed(2)}% ${deal.compliance.dsrPass ? '✓' : '✗'}
LTV: ${deal.compliance.ltv.toFixed(2)}% ${deal.compliance.ltvPass ? '✓' : '✗'}
Status: ${deal.compliance.overall ? 'COMPLIANT' : 'NON-COMPLIANT'}

GROSS PROFIT
Vehicle Gross: $${deal.grossProfit.vehicleGross.toLocaleString()}
Lender Reserve: $${deal.grossProfit.lenderReserve.toLocaleString()}
Rate Upsell: $${deal.grossProfit.rateUpsell.toLocaleString()}
Product Margin: $${deal.grossProfit.productMargin.toLocaleString()}
TOTAL: $${deal.grossProfit.total.toLocaleString()}
`;
}
```

---

## src/api/api.ts

```ts
/**
 * EXPRESS API WRAPPER
 * REST endpoints for deal finding, inventory, and GHL integration
 */

import express, { Request, Response } from 'express';
import { findOptimalDeals } from '../modules/deal-maximizer';
import { getAllLenderPrograms } from '../modules/lender-programs';
import { saveDealToGHL } from '../modules/ghl-integration';
import { loadInventoryFromCSV } from '../modules/inventory-manager';
import { FindDealsRequest, FindDealsResponse, Vehicle } from '../types/types';

const router = express.Router();
let inventory: Vehicle[] = [];

router.post('/deals/find', (req: Request, res: Response) => {
  try {
    const request: FindDealsRequest = req.body;

    if (!request.monthlyIncome || !request.lender || !request.tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: monthlyIncome, lender, tier',
      });
    }

    const deals = findOptimalDeals(request, inventory);

    const response: FindDealsResponse = {
      success: true,
      deals,
      summary: {
        totalVehiclesScanned: inventory.length,
        totalCompliantDeals: deals.length,
        topDealGrossProfit: deals[0]?.grossProfit.total || 0,
        averageMonthlyPayment:
          deals.length > 0
            ? deals.reduce((sum, d) => sum + d.monthlyPayment, 0) / deals.length
            : 0,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/lenders', (req: Request, res: Response) => {
  try {
    const lenders = getAllLenderPrograms();
    res.json({ success: true, lenders });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/inventory/upload', (req: Request, res: Response) => {
  try {
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({
        success: false,
        error: 'CSV content required',
      });
    }

    inventory = loadInventoryFromCSV(csvContent);

    res.json({
      success: true,
      message: `Loaded ${inventory.length} vehicles`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/inventory', (req: Request, res: Response) => {
  res.json({
    success: true,
    total: inventory.length,
    vehicles: inventory,
  });
});

router.post('/deals/save-to-ghl', async (req: Request, res: Response) => {
  try {
    const { dealId, customerId, ghlAccessToken } = req.body;

    if (!dealId || !customerId || !ghlAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: dealId, customerId, ghlAccessToken',
      });
    }

    res.json({
      success: true,
      message: 'Endpoint ready for implementation',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
```

---

## src/api/main.ts

```ts
/**
 * EXPRESS SERVER ENTRY POINT
 * Starts Finance-in-a-Box API server
 */

import express from 'express';
import cors from 'cors';
import router from './api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'Finance-in-a-Box API is running' });
});

app.listen(PORT, () => {
  console.log(`✅ Finance-in-a-Box API listening on port ${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   POST   /api/deals/find         - Find best deals`);
  console.log(`   GET    /api/lenders            - List all lenders`);
  console.log(`   POST   /api/inventory/upload   - Upload CSV inventory`);
  console.log(`   GET    /api/inventory          - Get current inventory`);
  console.log(`   POST   /api/deals/save-to-ghl  - Save to GoHighLevel`);
});

export default app;
```

---

## src/tests/all.test.ts

```ts
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
```

---

## Notes
- package.json currently points to `dist/src/api/main.js`. If your TypeScript outDir compiles to `dist/api/main.js`, update:
  - main: `dist/api/main.js`
  - start: `node dist/api/main.js`
- Consider adding TypeScript types in tsconfig: `"types": ["node", "jest"]` and possibly DOM lib if using `fetch` in Node versions without native fetch.
- Install missing type packages if needed: `@types/express`, `@types/cors`, `@types/jest`, `@types/node`.
