/**
 * MODULE 9: INVENTORY MANAGER
 * Handles CSV loading, vehicle parsing, VIN decoding
 */

import { Vehicle } from '../types/types';
import { decodeVIN, getVehicleValuation } from './vin-decoder';

export function loadInventoryFromCSV(csvContent: string): Vehicle[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header and at least one data row');
  const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const vehicles: Vehicle[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(v => v.trim());
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
        imageUrl: vehicleData.image_url || vehicleData.image || vehicleData.photo_url || vehicleData.photoUrl || undefined,
        blackBookValue: vehicleData.black_book_value ? parseFloat(vehicleData.black_book_value) : undefined,
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

export async function enrichWithVinAuditValuations(inventory: Vehicle[]): Promise<Vehicle[]> {
  const key = process.env.VINAUDIT_API_KEY;
  if (!key) return inventory;

  const updated: Vehicle[] = [];
  for (const v of inventory) {
    try {
      const valuation = await getVehicleValuation(v.vin, v.mileage);
      updated.push({
        ...v,
        cbbWholesale: valuation.wholesale,
        cbbRetail: valuation.retail,
      });
    } catch (_e) {
      updated.push(v);
    }
  }
  return updated;
}

// Robust CSV line parser that handles quotes, commas, and escaped quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') { // escaped quote
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}
