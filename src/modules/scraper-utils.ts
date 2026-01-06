/**
 * SCRAPER UTILITIES MODULE
 * Retry logic, rate limiting, and helper functions
 */

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Rate limiter with delay between requests
 */
export class RateLimiter {
  private lastRequestTime: number = 0;
  private delayMs: number;

  constructor(delayMs: number = 500) {
    this.delayMs = delayMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastRequest;
      console.log(`[RATE_LIMIT] Waiting ${waitTime}ms before next request`);
      await sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate vehicle data quality
 */
export interface DataQualityResult {
  isValid: boolean;
  score: number; // 0-100
  missingFields: string[];
  warnings: string[];
}

export function validateVehicleData(vehicle: any): DataQualityResult {
  const result: DataQualityResult = {
    isValid: true,
    score: 100,
    missingFields: [],
    warnings: []
  };

  // Critical fields (20 points each)
  const criticalFields = ['vin', 'year', 'make', 'model', 'suggestedPrice'];
  for (const field of criticalFields) {
    if (!vehicle[field] || vehicle[field] === 'Unknown' || vehicle[field] === 0) {
      result.missingFields.push(field);
      result.score -= 20;
      result.isValid = false;
    }
  }

  // Important fields (10 points each)
  const importantFields = ['mileage', 'engine', 'transmission'];
  for (const field of importantFields) {
    if (!vehicle[field] || vehicle[field] === 'Unknown' || vehicle[field] === 0) {
      result.warnings.push(`Missing ${field}`);
      result.score -= 10;
    }
  }

  // Optional fields (5 points each)
  const optionalFields = ['imageUrl', 'trim', 'color'];
  for (const field of optionalFields) {
    if (!vehicle[field]) {
      result.score -= 5;
    }
  }

  result.score = Math.max(0, result.score);
  
  return result;
}

/**
 * Normalize stock number format
 */
export function normalizeStockNumber(stock: string): string {
  if (!stock) return stock;
  
  // Remove common prefixes
  stock = stock.replace(/^(STK|STOCK|VEH|INV)[-_]?/i, '');
  
  // Add STK- prefix if not present
  if (!/^STK-/.test(stock)) {
    stock = `STK-${stock}`;
  }
  
  return stock.toUpperCase();
}

/**
 * Extract additional vehicle data from text
 */
export function extractVehicleDetails(text: string): {
  exteriorColor?: string;
  interiorColor?: string;
  drivetrain?: string;
  fuelType?: string;
} {
  const details: any = {};

  // Extract exterior color
  const exteriorMatch = text.match(/(?:Exterior|Ext\.|Color):\s*([A-Za-z\s]+?)(?:\n|,|Interio r)/i);
  if (exteriorMatch) {
    details.exteriorColor = exteriorMatch[1].trim();
  }

  // Extract interior color
  const interiorMatch = text.match(/(?:Interior|Int\.):\s*([A-Za-z\s]+?)(?:\n|,|$)/i);
  if (interiorMatch) {
    details.interiorColor = interiorMatch[1].trim();
  }

  // Extract drivetrain
  const drivetrainPatterns = [
    /\b(AWD|4WD|FWD|RWD|4X4|4X2)\b/i,
    /(?:Drivetrain|Drive):\s*(AWD|4WD|FWD|RWD|4X4|4X2)/i
  ];
  for (const pattern of drivetrainPatterns) {
    const match = text.match(pattern);
    if (match) {
      details.drivetrain = match[1].toUpperCase();
      break;
    }
  }

  // Extract fuel type
  const fuelPatterns = [
    /\b(Gasoline|Diesel|Electric|Hybrid|Plug-in Hybrid|PHEV)\b/i,
    /(?:Fuel|Engine):\s*(Gasoline|Diesel|Electric|Hybrid)/i
  ];
  for (const pattern of fuelPatterns) {
    const match = text.match(pattern);
    if (match) {
      details.fuelType = match[1];
      break;
    }
  }

  return details;
}

/**
 * Progress tracker for streaming results
 */
export class ProgressTracker {
  private total: number;
  private current: number = 0;
  private onProgress?: (progress: number, current: number, total: number) => void;

  constructor(total: number, onProgress?: (progress: number, current: number, total: number) => void) {
    this.total = total;
    this.onProgress = onProgress;
  }

  increment(): void {
    this.current++;
    const progress = Math.round((this.current / this.total) * 100);
    
    if (this.onProgress) {
      this.onProgress(progress, this.current, this.total);
    }
  }

  getProgress(): { progress: number; current: number; total: number } {
    return {
      progress: Math.round((this.current / this.total) * 100),
      current: this.current,
      total: this.total
    };
  }
}
