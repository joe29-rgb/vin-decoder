/**
 * PROVINCIAL FEES
 * 
 * PPSA (Personal Property Security Act) registration fees are set by each province.
 * These are NOT dealership-specific - they are provincial government fees.
 * 
 * Source: Provincial government fee schedules
 * Last Updated: January 2026
 */

export const PPSA_FEES: Record<string, number> = {
  AB: 38.73,  // Alberta
  BC: 40.00,  // British Columbia
  SK: 35.00,  // Saskatchewan
  MB: 35.00,  // Manitoba
  ON: 65.00,  // Ontario
  QC: 0.00,   // Quebec (no PPSA)
  NB: 50.00,  // New Brunswick
  NS: 50.00,  // Nova Scotia
  PE: 50.00,  // Prince Edward Island
  NL: 50.00,  // Newfoundland and Labrador
  YT: 35.00,  // Yukon
  NT: 35.00,  // Northwest Territories
  NU: 35.00,  // Nunavut
};

/**
 * Get PPSA fee for a province
 * @param province - Two-letter province code (e.g., 'AB', 'ON')
 * @returns PPSA fee amount
 */
export function getPPSAFee(province: string): number {
  const provinceUpper = province.toUpperCase();
  return PPSA_FEES[provinceUpper] ?? PPSA_FEES.AB; // Default to Alberta if unknown
}
