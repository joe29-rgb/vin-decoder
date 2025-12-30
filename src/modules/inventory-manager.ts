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

    // Helpers for flexible header mapping
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        if (vehicleData[k] !== undefined && vehicleData[k] !== '') return vehicleData[k];
      }
      return undefined;
    };

    try {
      const vin = (pick('vin') || '') as string;
      const vinData = vin.length === 17 ? decodeVIN(vin) : null;

      const vehicle: Vehicle = {
        id: (pick('stock','stock_number','stocknum','stockno','id','vehicleid','vehicle_id') as string) || `STOCK-${i}`,
        vin,
        year: vinData?.year || parseInt((pick('year','vehicle_year') as string) || '0'),
        make: vinData?.make || (pick('make','vehicle_make') as string) || 'Unknown',
        model: vinData?.model || (pick('model','vehicle_model') as string) || 'Unknown',
        trim: (pick('trim') as string) || '',
        mileage: parseInt((pick('mileage','kms','km','kilometers','odometer') as string) || '0') || 0,
        color: (pick('color','exterior_color') as string) || '',
        engine: vinData?.engine || (pick('engine','motor') as string) || 'Unknown',
        transmission: (pick('transmission','trans','gearbox') as string) || 'Unknown',
        cbbWholesale:
          parseFloat((pick('cbb_wholesale','cbbwholesale','bb_wholesale','bbwholesale','blackbook_wholesale','black_book_wholesale') as string) || '0') || 0,
        cbbRetail:
          parseFloat((pick('cbb_retail','cbbretail','bb_retail','bbretail','blackbook_retail','black_book_retail') as string) || '0') || 0,
        yourCost:
          parseFloat((pick('your_cost','yourcost','cost','purchase_cost','our_cost','acquisition_cost','base_cost','vehicle_cost') as string) || '0') || 0,
        suggestedPrice:
          parseFloat((pick('suggested_price','suggestedprice','price','retail_price','list_price','asking_price','sale_price','msrp') as string) || '0') || 0,
        inStock: (function(){
          const v = (pick('in_stock','instock','available','status') as string) || '';
          const val = String(v).toLowerCase();
          if (!val) return true;
          return !(val === 'false' || val === 'no' || val === '0' || val === 'sold' || val === 'unavailable');
        })(),
        imageUrl: (pick('image_url','imageurl','image','photo_url','photourl','photo','picture_url','picture') as string) || undefined,
        blackBookValue: (function(){
          const b = pick('black_book_value','blackbook','bb','bb_value','black_book');
          return b != null && b !== '' ? parseFloat(String(b)) : undefined;
        })(),
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
