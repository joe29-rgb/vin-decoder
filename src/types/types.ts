/**
 * CENTRAL TYPES FOR FINANCE-IN-A-BOX
 * All TypeScript interfaces used across the system
 */

export type LenderType = 'TD' | 'Santander' | 'SDA' | 'AutoCapital' | 'EdenPark' | 'IAAutoFinance' | 'LendCare' | 'Northlake' | 'RIFCO' | 'Prefera';
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
  imageUrl?: string;
  imageUrls?: string[];
  blackBookValue?: number;
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
  maxTerm?: number;
  maxVehicleAge?: number;
  maxMileage?: number;
  minCreditScore?: number;
  apr?: number;
  maxLTV?: number;
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

/**
 * Lender approval specification (from GHL webhook)
 */
export type BackCapType = 'percent_of_bb' | 'percent_of_price';

export interface BackCapRule {
  type: BackCapType;
  percent: number; // e.g. 0.2 for 20%
}

export interface ApprovalSpec {
  bank: string;            // e.g. 'TD', 'SDA', 'Santander'
  program: string;         // e.g. '5 key', 'Tier 3'
  apr: number;             // annual percentage rate
  termMonths: number;      // loan term
  paymentMin: number;      // min monthly payment constraint
  paymentMax: number;      // max monthly payment constraint
  frontCapFactor?: number; // optional multiplier on Black Book to cap front-end price
  backCap?: BackCapRule;   // optional cap for back-end as % of BB or price
  province?: Province;     // optional taxation province
  downPayment?: number;    // optional down payment
  isNativeStatus?: boolean; // tax exempt for status natives
  customerName?: string;   // customer name for manual entry
}

export interface TradeInfo {
  allowance: number;   // trade allowance offered
  acv: number;         // actual cash value of trade
  lienBalance: number; // outstanding loan balance on trade
}

export interface ApprovalIngestPayload {
  contactId: string;
  locationId: string;
  approval: ApprovalSpec;
  trade: TradeInfo;
  blackBook?: {
    overrideVehicleId?: string;
    overrideValue?: number;
  };
}

export interface ScoredVehicleRow {
  vehicleId: string;
  vin: string;
  title: string;
  imageUrl?: string;
  salePrice: number;
  monthlyPayment: number;
  frontGross: number;
  backGross: number;
  totalGross: number;
  flags: string[];
}

export interface ScoreRequest {
  approval?: ApprovalSpec; // if omitted, use last ingested
  trade?: TradeInfo;       // if omitted, use last ingested
}

export interface ScoreResponse {
  approval: ApprovalSpec;
  rows: ScoredVehicleRow[];
}

/**
 * Dynamic lender rules (uploaded monthly, not hard-coded)
 */
export interface ReserveBracket {
  minFinanced: number; // inclusive
  maxFinanced: number; // inclusive
  amount: number;      // fixed reserve/bonus amount
}

export interface ReserveRule {
  // Reserve as a percent of amount financed (e.g., 0.02 for 2%)
  percentOfFinanced?: number;
  // Fixed reserve tiers by amount financed
  fixedByFinancedAmount?: ReserveBracket[];
  // Quality bonus tiers by amount financed
  qualityBonusByFinancedAmount?: ReserveBracket[];
  // Typical chargeback window if applicable (e.g., 180 days)
  chargebackDays?: number;
}

export interface TermByModelYearRule {
  yearFrom: number; // inclusive
  yearTo: number;   // inclusive
  maxTermMonths: number;
}

export interface LenderRuleSet {
  bank: string;              // e.g., 'GBC', 'EdenPark', 'Scotiabank', 'CIBC', 'IA Auto'
  program: string;           // e.g., 'New & Nearly New', 'Ride 5', 'Auto Special'
  // Optional caps; if not provided in ApprovalSpec, these fill in
  frontCapFactor?: number;   // multiplier on Black Book
  backCap?: BackCapRule;     // cap for back-end as % of BB or price
  // Reserves/Bonuses paid by lender
  reserve?: ReserveRule;
  // Lender-imposed max payment call (overrides approval.paymentMax if lower)
  maxPayCall?: number;
  // Eligibility constraints (optional, extend as needed)
  termByModelYear?: TermByModelYearRule[];
}
