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
