/**
 * MODULE 8: VIN DECODER
 * Extracts vehicle information from VIN number
 */

import axios from 'axios';
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

const VINAUDIT_API_KEY = process.env.VINAUDIT_API_KEY;
const VINAUDIT_BASE_URL = 'https://api.vinaudit.ca/v2';

/**
 * Attempt to decode VIN via VinAudit Canada API.
 * Falls back to static decoder if API key is missing or API fails.
 */
export async function decodeVINWithVinAudit(vin: string): Promise<VINDecodingResult> {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    throw new Error('Invalid VIN format: Must be 17 characters (excluding I, O, Q)');
  }

  if (!VINAUDIT_API_KEY) {
    return decodeVIN(vin);
  }

  try {
    const response = await axios.get(`${VINAUDIT_BASE_URL}/specifications`, {
      params: { key: VINAUDIT_API_KEY, vin, format: 'json' },
      timeout: 5000,
    });
    const data = response.data;
    const specs = data?.attributes || {};

    const year = parseInt(specs.year) || decodeModelYear(vin.charAt(9));
    return {
      year,
      make: specs.make || 'Unknown',
      model: specs.model || 'Unknown',
      body: specs.body_style || 'Unknown',
      engine: specs.engine || 'Unknown',
      transmission: specs.transmission || 'Unknown',
    };
  } catch (_e) {
    return decodeVIN(vin);
  }
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

/**
 * Get market valuation from VinAudit Canada.
 */
export async function getVehicleValuation(
  vin: string,
  mileage?: number
): Promise<{ wholesale: number; retail: number }> {
  if (!VINAUDIT_API_KEY) {
    throw new Error('VINAUDIT_API_KEY required for valuations');
  }

  // Official doc shows marketvalue endpoint on marketvalue.vinaudit.com
  const response = await axios.get('https://marketvalue.vinaudit.com/getmarketvalue.php', {
    params: {
      key: VINAUDIT_API_KEY,
      vin,
      mileage,
      period: 90,
      country: 'canada',
      format: 'json',
    },
    timeout: 5000,
  });

  const data = response.data || {};
  const wholesale = data.wholesale_mean ?? data.prices?.below ?? data.below ?? 0;
  const retail = data.retail_mean ?? data.market_value?.mean ?? data.prices?.average ?? data.mean ?? 0;

  return { wholesale, retail };
}
