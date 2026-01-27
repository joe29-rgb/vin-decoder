/**
 * VEHICLE BOOKING GUIDE
 * 
 * Determines maximum loan term based on vehicle year and mileage per lender guidelines.
 * This replaces the incorrect termByModelYear approach with actual lender booking rules.
 * 
 * Data sourced from official lender booking guides (January 2026).
 */

export interface MileageRange {
  minKm: number;
  maxKm: number;
  maxTermMonths: number;
}

export interface YearBooking {
  year: number;
  ranges: MileageRange[];
}

export interface LenderBookingGuide {
  lender: string;
  bookings: YearBooking[];
  defaultMaxTerm?: number; // Fallback for unlisted years
}

/**
 * Get maximum term for a vehicle based on year and mileage
 */
export function getMaxTermForVehicle(
  lender: string,
  tier: string,
  year: number,
  mileage: number
): number {
  const guide = LENDER_BOOKING_GUIDES[lender];
  if (!guide) {
    console.warn(`[BOOKING] No booking guide for lender: ${lender}`);
    return 60; // Conservative default
  }

  // Find year booking
  const yearBooking = guide.bookings.find(b => b.year === year);
  if (!yearBooking) {
    // Use default or conservative fallback
    return guide.defaultMaxTerm || 60;
  }

  // Find mileage range
  for (const range of yearBooking.ranges) {
    if (mileage >= range.minKm && mileage <= range.maxKm) {
      return range.maxTermMonths;
    }
  }

  // If mileage exceeds all ranges, vehicle likely ineligible
  console.warn(`[BOOKING] Vehicle exceeds mileage ranges: ${lender} ${year} ${mileage}km`);
  return 0; // Ineligible
}

/**
 * LENDER BOOKING GUIDES
 * Extracted from official lender documentation (January 2026)
 */
export const LENDER_BOOKING_GUIDES: Record<string, LenderBookingGuide> = {
  'LendCare': {
    lender: 'LendCare',
    defaultMaxTerm: 48,
    bookings: [
      {
        year: 2025,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 84 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 84 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 84 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 84 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 84 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 78 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 84 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 78 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 84 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 78 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 78 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 72 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 72 },
        ],
      },
      {
        year: 2017,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 78 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 72 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 72 },
        ],
      },
      {
        year: 2016,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 78 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 72 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 72 },
        ],
      },
      {
        year: 2015,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 72 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 72 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 66 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2014,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 72 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 72 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 66 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2013,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 66 },
          { minKm: 75001, maxKm: 150000, maxTermMonths: 66 },
          { minKm: 150001, maxKm: 200000, maxTermMonths: 60 },
          { minKm: 200001, maxKm: 250000, maxTermMonths: 60 },
        ],
      },
    ],
  },

  'AutoCapital': {
    lender: 'AutoCapital',
    defaultMaxTerm: 48,
    bookings: [
      {
        year: 2025,
        ranges: [
          { minKm: 10001, maxKm: 40000, maxTermMonths: 84 },
          { minKm: 40001, maxKm: 65000, maxTermMonths: 84 },
          { minKm: 65001, maxKm: 95000, maxTermMonths: 84 },
          { minKm: 95001, maxKm: 115000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 0, maxKm: 65000, maxTermMonths: 84 },
          { minKm: 65001, maxKm: 95000, maxTermMonths: 84 },
          { minKm: 95001, maxKm: 135000, maxTermMonths: 84 },
          { minKm: 135001, maxKm: 195000, maxTermMonths: 78 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 80000, maxTermMonths: 84 },
          { minKm: 80001, maxKm: 115000, maxTermMonths: 84 },
          { minKm: 115001, maxKm: 155000, maxTermMonths: 84 },
          { minKm: 155001, maxKm: 195000, maxTermMonths: 72 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 120000, maxTermMonths: 84 },
          { minKm: 120001, maxKm: 155000, maxTermMonths: 78 },
          { minKm: 155001, maxKm: 195000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 100000, maxTermMonths: 84 },
          { minKm: 100001, maxKm: 135000, maxTermMonths: 84 },
          { minKm: 135001, maxKm: 175000, maxTermMonths: 78 },
          { minKm: 175001, maxKm: 195000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 105000, maxTermMonths: 84 },
          { minKm: 105001, maxKm: 140000, maxTermMonths: 84 },
          { minKm: 140001, maxKm: 175000, maxTermMonths: 72 },
          { minKm: 175001, maxKm: 195000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 115000, maxTermMonths: 78 },
          { minKm: 115001, maxKm: 145000, maxTermMonths: 72 },
          { minKm: 145001, maxKm: 175000, maxTermMonths: 66 },
          { minKm: 175001, maxKm: 195000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 155000, maxTermMonths: 66 },
          { minKm: 155001, maxKm: 175000, maxTermMonths: 60 },
          { minKm: 175001, maxKm: 195000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2017,
        ranges: [
          { minKm: 0, maxKm: 155000, maxTermMonths: 54 },
          { minKm: 155001, maxKm: 175000, maxTermMonths: 54 },
          { minKm: 175001, maxKm: 190000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2016,
        ranges: [
          { minKm: 0, maxKm: 155000, maxTermMonths: 42 },
          { minKm: 155001, maxKm: 170000, maxTermMonths: 42 },
          { minKm: 170001, maxKm: 190000, maxTermMonths: 36 },
        ],
      },
      {
        year: 2015,
        ranges: [
          { minKm: 0, maxKm: 155000, maxTermMonths: 30 },
          { minKm: 155001, maxKm: 170000, maxTermMonths: 30 },
          { minKm: 170001, maxKm: 190000, maxTermMonths: 24 },
        ],
      },
    ],
  },

  'Northlake': {
    lender: 'Northlake',
    defaultMaxTerm: 48,
    bookings: [
      {
        year: 2025,
        ranges: [
          { minKm: 0, maxKm: 45000, maxTermMonths: 84 },
          { minKm: 45001, maxKm: 70000, maxTermMonths: 84 },
          { minKm: 70001, maxKm: 100000, maxTermMonths: 84 },
          { minKm: 100001, maxKm: 120000, maxTermMonths: 84 },
          { minKm: 120001, maxKm: 300000, maxTermMonths: 78 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 0, maxKm: 50000, maxTermMonths: 84 },
          { minKm: 50001, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 84 },
          { minKm: 130001, maxKm: 160000, maxTermMonths: 84 },
          { minKm: 160001, maxKm: 300000, maxTermMonths: 72 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 110000, maxTermMonths: 84 },
          { minKm: 110001, maxKm: 135000, maxTermMonths: 84 },
          { minKm: 135001, maxKm: 180000, maxTermMonths: 72 },
          { minKm: 180001, maxKm: 300000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 70000, maxTermMonths: 84 },
          { minKm: 70001, maxKm: 125000, maxTermMonths: 84 },
          { minKm: 125001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 72 },
          { minKm: 180001, maxKm: 300000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 125000, maxTermMonths: 84 },
          { minKm: 125001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 72 },
          { minKm: 180001, maxKm: 300000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 125000, maxTermMonths: 72 },
          { minKm: 125001, maxKm: 150000, maxTermMonths: 72 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 66 },
          { minKm: 180001, maxKm: 300000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 100000, maxTermMonths: 72 },
          { minKm: 100001, maxKm: 140000, maxTermMonths: 72 },
          { minKm: 140001, maxKm: 175000, maxTermMonths: 66 },
          { minKm: 175001, maxKm: 200000, maxTermMonths: 66 },
          { minKm: 200001, maxKm: 300000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 100000, maxTermMonths: 72 },
          { minKm: 100001, maxKm: 140000, maxTermMonths: 72 },
          { minKm: 140001, maxKm: 175000, maxTermMonths: 66 },
          { minKm: 175001, maxKm: 200000, maxTermMonths: 60 },
          { minKm: 200001, maxKm: 300000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2017,
        ranges: [
          { minKm: 0, maxKm: 100000, maxTermMonths: 72 },
          { minKm: 100001, maxKm: 140000, maxTermMonths: 66 },
          { minKm: 140001, maxKm: 175000, maxTermMonths: 60 },
          { minKm: 175001, maxKm: 200000, maxTermMonths: 54 },
          { minKm: 200001, maxKm: 300000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2016,
        ranges: [
          { minKm: 0, maxKm: 140000, maxTermMonths: 60 },
          { minKm: 140001, maxKm: 175000, maxTermMonths: 60 },
          { minKm: 175001, maxKm: 200000, maxTermMonths: 48 },
          { minKm: 200001, maxKm: 300000, maxTermMonths: 36 },
        ],
      },
      {
        year: 2015,
        ranges: [
          { minKm: 0, maxKm: 140000, maxTermMonths: 48 },
          { minKm: 140001, maxKm: 175000, maxTermMonths: 42 },
          { minKm: 175001, maxKm: 200000, maxTermMonths: 36 },
          { minKm: 200001, maxKm: 300000, maxTermMonths: 36 },
        ],
      },
      {
        year: 2014,
        ranges: [
          { minKm: 0, maxKm: 140000, maxTermMonths: 48 },
          { minKm: 140001, maxKm: 175000, maxTermMonths: 42 },
          { minKm: 175001, maxKm: 200000, maxTermMonths: 36 },
          { minKm: 200001, maxKm: 300000, maxTermMonths: 36 },
        ],
      },
    ],
  },

  'RIFCO': {
    lender: 'RIFCO',
    defaultMaxTerm: 54,
    bookings: [
      {
        year: 2026,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 84 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 78 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 72 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 72 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 66 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2025,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 84 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 78 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 72 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 72 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 66 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 84 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 78 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 72 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 72 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 66 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 84 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 78 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 72 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 72 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 66 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 84 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 78 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 72 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 72 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 66 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 84 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 78 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 72 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 72 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 66 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 84 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 78 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 72 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 72 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 66 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 84 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 78 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 72 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 72 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 66 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 60 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 24000, maxTermMonths: 78 },
          { minKm: 24001, maxKm: 48000, maxTermMonths: 72 },
          { minKm: 48001, maxKm: 72000, maxTermMonths: 66 },
          { minKm: 72001, maxKm: 96000, maxTermMonths: 66 },
          { minKm: 96001, maxKm: 120000, maxTermMonths: 60 },
          { minKm: 120001, maxKm: 144000, maxTermMonths: 54 },
          { minKm: 144001, maxKm: 168000, maxTermMonths: 54 },
        ],
      },
    ],
  },

  'EdenPark': {
    lender: 'EdenPark',
    defaultMaxTerm: 48,
    bookings: [
      {
        year: 2026,
        ranges: [
          { minKm: 5001, maxKm: 40000, maxTermMonths: 84 },
          { minKm: 40001, maxKm: 65000, maxTermMonths: 84 },
          { minKm: 65001, maxKm: 95000, maxTermMonths: 84 },
          { minKm: 95001, maxKm: 120000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2025,
        ranges: [
          { minKm: 5001, maxKm: 40000, maxTermMonths: 84 },
          { minKm: 40001, maxKm: 65000, maxTermMonths: 84 },
          { minKm: 65001, maxKm: 95000, maxTermMonths: 84 },
          { minKm: 95001, maxKm: 120000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 0, maxKm: 68000, maxTermMonths: 84 },
          { minKm: 68001, maxKm: 100000, maxTermMonths: 84 },
          { minKm: 100001, maxKm: 130000, maxTermMonths: 84 },
          { minKm: 130001, maxKm: 180000, maxTermMonths: 72 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 78000, maxTermMonths: 84 },
          { minKm: 78001, maxKm: 125000, maxTermMonths: 84 },
          { minKm: 125001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 85000, maxTermMonths: 84 },
          { minKm: 85001, maxKm: 125000, maxTermMonths: 84 },
          { minKm: 125001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 95000, maxTermMonths: 84 },
          { minKm: 95001, maxKm: 130000, maxTermMonths: 84 },
          { minKm: 130001, maxKm: 160000, maxTermMonths: 72 },
          { minKm: 160001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 95000, maxTermMonths: 84 },
          { minKm: 95001, maxKm: 120000, maxTermMonths: 84 },
          { minKm: 120001, maxKm: 170000, maxTermMonths: 72 },
          { minKm: 170001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 110000, maxTermMonths: 78 },
          { minKm: 110001, maxKm: 135000, maxTermMonths: 72 },
          { minKm: 135001, maxKm: 170000, maxTermMonths: 60 },
          { minKm: 170001, maxKm: 180000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 110000, maxTermMonths: 72 },
          { minKm: 110001, maxKm: 130000, maxTermMonths: 66 },
          { minKm: 130001, maxKm: 170000, maxTermMonths: 54 },
          { minKm: 170001, maxKm: 180000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2017,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 48 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 48 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 36 },
        ],
      },
      {
        year: 2016,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 48 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 42 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 24 },
        ],
      },
      {
        year: 2015,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 36 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 36 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 12 },
        ],
      },
    ],
  },

  'IAAutoFinance': {
    lender: 'IAAutoFinance',
    defaultMaxTerm: 48,
    bookings: [
      {
        year: 2026,
        ranges: [
          { minKm: 0, maxKm: 35000, maxTermMonths: 84 },
          { minKm: 35001, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 120000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2025,
        ranges: [
          { minKm: 0, maxKm: 35000, maxTermMonths: 84 },
          { minKm: 35001, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 120000, maxTermMonths: 84 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 0, maxKm: 65000, maxTermMonths: 84 },
          { minKm: 65001, maxKm: 95000, maxTermMonths: 84 },
          { minKm: 95001, maxKm: 120000, maxTermMonths: 84 },
          { minKm: 120001, maxKm: 180000, maxTermMonths: 72 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 120000, maxTermMonths: 84 },
          { minKm: 120001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 80000, maxTermMonths: 84 },
          { minKm: 80001, maxKm: 120000, maxTermMonths: 84 },
          { minKm: 120001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 120000, maxTermMonths: 84 },
          { minKm: 120001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 120000, maxTermMonths: 78 },
          { minKm: 120001, maxKm: 165000, maxTermMonths: 72 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 78 },
          { minKm: 90001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 165000, maxTermMonths: 66 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 78 },
          { minKm: 90001, maxKm: 120000, maxTermMonths: 72 },
          { minKm: 120001, maxKm: 165000, maxTermMonths: 60 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2017,
        ranges: [
          { minKm: 0, maxKm: 120000, maxTermMonths: 60 },
          { minKm: 120001, maxKm: 165000, maxTermMonths: 54 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 30 },
        ],
      },
      {
        year: 2016,
        ranges: [
          { minKm: 0, maxKm: 120000, maxTermMonths: 48 },
          { minKm: 120001, maxKm: 165000, maxTermMonths: 42 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 30 },
        ],
      },
      {
        year: 2015,
        ranges: [
          { minKm: 0, maxKm: 120000, maxTermMonths: 48 },
          { minKm: 120001, maxKm: 165000, maxTermMonths: 42 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 30 },
        ],
      },
    ],
  },

  'Santander': {
    lender: 'Santander',
    defaultMaxTerm: 48,
    bookings: [
      {
        year: 2025,
        ranges: [
          { minKm: 0, maxKm: 35000, maxTermMonths: 84 },
          { minKm: 35001, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 90000, maxTermMonths: 78 },
          { minKm: 90001, maxKm: 120000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 0, maxKm: 65000, maxTermMonths: 84 },
          { minKm: 65001, maxKm: 95000, maxTermMonths: 84 },
          { minKm: 95001, maxKm: 130000, maxTermMonths: 78 },
          { minKm: 130001, maxKm: 150000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 75000, maxTermMonths: 84 },
          { minKm: 75001, maxKm: 110000, maxTermMonths: 84 },
          { minKm: 110001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 80000, maxTermMonths: 84 },
          { minKm: 80001, maxKm: 110000, maxTermMonths: 84 },
          { minKm: 110001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 84 },
          { minKm: 130001, maxKm: 170000, maxTermMonths: 78 },
          { minKm: 170001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 78 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 78 },
          { minKm: 130001, maxKm: 170000, maxTermMonths: 72 },
          { minKm: 170001, maxKm: 180000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 105000, maxTermMonths: 78 },
          { minKm: 105001, maxKm: 140000, maxTermMonths: 72 },
          { minKm: 140001, maxKm: 170000, maxTermMonths: 66 },
          { minKm: 170001, maxKm: 180000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 105000, maxTermMonths: 60 },
          { minKm: 105001, maxKm: 145000, maxTermMonths: 60 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 54 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 54 },
        ],
      },
      {
        year: 2017,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 48 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 42 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 42 },
        ],
      },
      {
        year: 2016,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 30 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 30 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 30 },
        ],
      },
      {
        year: 2015,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 18 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 18 },
          { minKm: 165001, maxKm: 180000, maxTermMonths: 18 },
        ],
      },
    ],
  },

  'TD': {
    lender: 'TD',
    defaultMaxTerm: 48,
    bookings: [
      {
        year: 2025,
        ranges: [
          { minKm: 20001, maxKm: 35000, maxTermMonths: 84 },
          { minKm: 35001, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 999999, maxTermMonths: 66 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 20001, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 84 },
          { minKm: 130001, maxKm: 999999, maxTermMonths: 60 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 70000, maxTermMonths: 84 },
          { minKm: 70001, maxKm: 105000, maxTermMonths: 84 },
          { minKm: 105001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 999999, maxTermMonths: 60 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 80000, maxTermMonths: 84 },
          { minKm: 80001, maxKm: 105000, maxTermMonths: 84 },
          { minKm: 105001, maxKm: 150000, maxTermMonths: 84 },
          { minKm: 150001, maxKm: 999999, maxTermMonths: 48 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 84 },
          { minKm: 130001, maxKm: 170000, maxTermMonths: 78 },
          { minKm: 170001, maxKm: 999999, maxTermMonths: 48 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 72 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 78 },
          { minKm: 130001, maxKm: 170000, maxTermMonths: 72 },
          { minKm: 170001, maxKm: 999999, maxTermMonths: 48 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 105000, maxTermMonths: 72 },
          { minKm: 105001, maxKm: 140000, maxTermMonths: 78 },
          { minKm: 140001, maxKm: 170000, maxTermMonths: 72 },
          { minKm: 170001, maxKm: 999999, maxTermMonths: 48 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 60 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 60 },
          { minKm: 165001, maxKm: 999999, maxTermMonths: 54 },
        ],
      },
      {
        year: 2017,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 48 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 48 },
          { minKm: 165001, maxKm: 999999, maxTermMonths: 36 },
        ],
      },
      {
        year: 2016,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 36 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 24 },
          { minKm: 165001, maxKm: 999999, maxTermMonths: 24 },
        ],
      },
      {
        year: 2015,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 24 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 12 },
          { minKm: 165001, maxKm: 999999, maxTermMonths: 12 },
        ],
      },
    ],
  },

  'SDA': {
    lender: 'SDA',
    defaultMaxTerm: 48,
    bookings: [
      {
        year: 2026,
        ranges: [
          { minKm: 0, maxKm: 35000, maxTermMonths: 84 },
          { minKm: 35001, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 105000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2025,
        ranges: [
          { minKm: 0, maxKm: 35000, maxTermMonths: 84 },
          { minKm: 35001, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 105000, maxTermMonths: 66 },
        ],
      },
      {
        year: 2024,
        ranges: [
          { minKm: 0, maxKm: 60000, maxTermMonths: 84 },
          { minKm: 60001, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 84 },
          { minKm: 130001, maxKm: 185000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2023,
        ranges: [
          { minKm: 0, maxKm: 70000, maxTermMonths: 84 },
          { minKm: 70001, maxKm: 105000, maxTermMonths: 84 },
          { minKm: 105001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 185000, maxTermMonths: 60 },
        ],
      },
      {
        year: 2022,
        ranges: [
          { minKm: 0, maxKm: 80000, maxTermMonths: 84 },
          { minKm: 80001, maxKm: 105000, maxTermMonths: 84 },
          { minKm: 105001, maxKm: 150000, maxTermMonths: 78 },
          { minKm: 150001, maxKm: 185000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2021,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 84 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 78 },
          { minKm: 130001, maxKm: 170000, maxTermMonths: 72 },
          { minKm: 170001, maxKm: 185000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2020,
        ranges: [
          { minKm: 0, maxKm: 90000, maxTermMonths: 78 },
          { minKm: 90001, maxKm: 130000, maxTermMonths: 72 },
          { minKm: 130001, maxKm: 170000, maxTermMonths: 66 },
          { minKm: 170001, maxKm: 185000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2019,
        ranges: [
          { minKm: 0, maxKm: 105000, maxTermMonths: 78 },
          { minKm: 105001, maxKm: 140000, maxTermMonths: 72 },
          { minKm: 140001, maxKm: 170000, maxTermMonths: 60 },
          { minKm: 170001, maxKm: 185000, maxTermMonths: 48 },
        ],
      },
      {
        year: 2018,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 60 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 54 },
          { minKm: 165001, maxKm: 185000, maxTermMonths: 42 },
        ],
      },
      {
        year: 2017,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 48 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 36 },
          { minKm: 165001, maxKm: 185000, maxTermMonths: 36 },
        ],
      },
      {
        year: 2016,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 24 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 24 },
          { minKm: 165001, maxKm: 185000, maxTermMonths: 24 },
        ],
      },
      {
        year: 2015,
        ranges: [
          { minKm: 0, maxKm: 145000, maxTermMonths: 12 },
          { minKm: 145001, maxKm: 165000, maxTermMonths: 12 },
          { minKm: 165001, maxKm: 185000, maxTermMonths: 12 },
        ],
      },
    ],
  },

  'Prefera': {
    lender: 'Prefera',
    defaultMaxTerm: 48,
    bookings: [
      { year: 2026, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 84 }] },
      { year: 2025, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 84 }] },
      { year: 2024, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 84 }] },
      { year: 2023, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 84 }] },
      { year: 2022, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 84 }] },
      { year: 2021, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 84 }] },
      { year: 2020, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 72 }] },
      { year: 2019, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 60 }] },
      { year: 2018, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 48 }] },
      { year: 2017, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 36 }] },
      { year: 2016, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 24 }] },
      { year: 2015, ranges: [{ minKm: 0, maxKm: 999999, maxTermMonths: 12 }] },
    ],
  },
};
