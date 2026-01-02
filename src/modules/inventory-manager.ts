/**
 * MODULE 9: INVENTORY MANAGER
 * Handles CSV loading, vehicle parsing, VIN decoding
 */

import { Vehicle } from '../types/types';
import { decodeVIN, getVehicleValuation } from './vin-decoder';

export function loadInventoryFromCSV(csvContent: string): Vehicle[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header and at least one data row');
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const header = parseCSVLine(lines[0]).map(h => normalize(h));
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

    const num = (val: any, dflt = 0): number => {
      if (val === undefined || val === null || val === '') return dflt;
      let s = String(val).trim();
      // handle parentheses negatives and currency formatting
      const neg = /^\(.*\)$/.test(s);
      s = s.replace(/[,$]/g, '').replace(/^\(|\)$/g, '').replace(/\$/g, '');
      const n = parseFloat(s);
      if (isNaN(n)) return dflt;
      return neg ? -n : n;
    };

    try {
      const vin = (pick('vin') || '') as string;
      const vinData = vin.length === 17 ? decodeVIN(vin) : null;

      const csvMake = (pick('make','vehicle_make','veh_make','manufacturer','brand') as string) || '';
      const csvModel = (pick('model','vehicle_model') as string) || '';
      const csvYear = (pick('year','vehicle_year') as string) || '';
      const vehicle: Vehicle = {
        id: (pick('stock','stock_number','stocknum','stockno','stock_no','stockid','stock_id','id','vehicleid','vehicle_id') as string) || `STOCK-${i}`,
        vin,
        year: (parseInt(csvYear) || 0) || (vinData?.year || 0),
        make: (csvMake || vinData?.make || 'Unknown'),
        model: (csvModel || vinData?.model || 'Unknown'),
        trim: (pick('trim') as string) || '',
        mileage: parseInt((pick('mileage','kms','km','kilometers','odometer','odometer_km') as string) || '0') || 0,
        color: (pick('color','exterior_color') as string) || '',
        engine: vinData?.engine || (pick('engine','motor') as string) || 'Unknown',
        transmission: (pick('transmission','trans','gearbox') as string) || 'Unknown',
        cbbWholesale:
          num(pick('cbb_wholesale','cbbwholesale','bb_wholesale','bbwholesale','blackbook_wholesale','black_book_wholesale','bbw','bb_whl')), 
        cbbRetail:
          num(pick('cbb_retail','cbbretail','bb_retail','bbretail','blackbook_retail','black_book_retail','bbr','bb_rtl')),
        yourCost:
          num(pick('your_cost','yourcost','cost','purchase_cost','our_cost','acquisition_cost','base_cost','vehicle_cost','your_cost_$','yourcost$','buy_cost','cost_$')),
        suggestedPrice:
          num(pick('suggested_price','suggestedprice','price','retail_price','list_price','asking_price','sale_price','msrp','retail','retail_$','sale_price_$','asking')),
        inStock: (function(){
          const v = (pick('in_stock','instock','available','status') as string) || '';
          const val = String(v).toLowerCase();
          if (!val) return true;
          return !(val === 'false' || val === 'no' || val === '0' || val === 'sold' || val === 'unavailable');
        })(),
        imageUrl: (pick('image_url','imageurl','image','photo_url','photourl','photo','picture_url','picture') as string) || undefined,
        blackBookValue: (function(){
          const b = pick('black_book_value','blackbook','bb','bb_value','black_book','bbv','black_book$','blackbook_value');
          const n = num(b, NaN);
          return isNaN(n) ? undefined : n;
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
