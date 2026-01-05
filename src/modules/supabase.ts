import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Vehicle } from '../types/types';

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached as SupabaseClient | null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { cached = null; return null; }
  try {
    cached = createClient(url, key, { auth: { persistSession: false } });
    return cached;
  } catch (_e) {
    cached = null;
    return null;
  }
}

function toRow(v: Vehicle) {
  return {
    id: v.id,
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim ?? null,
    mileage: v.mileage,
    color: v.color ?? null,
    engine: v.engine,
    transmission: v.transmission,
    cbb_wholesale: v.cbbWholesale,
    cbb_retail: v.cbbRetail,
    your_cost: v.yourCost,
    suggested_price: v.suggestedPrice,
    in_stock: v.inStock,
    image_url: v.imageUrl ?? null,
    black_book_value: v.blackBookValue ?? null,
  } as const;
}

function fromRow(r: any): Vehicle {
  return {
    id: String(r.id),
    vin: String(r.vin || ''),
    year: Number(r.year || 0),
    make: String(r.make || 'Unknown'),
    model: String(r.model || 'Unknown'),
    trim: r.trim || undefined,
    mileage: Number(r.mileage || 0),
    color: r.color || undefined,
    engine: String(r.engine || 'Unknown'),
    transmission: String(r.transmission || 'Unknown'),
    cbbWholesale: Number(r.cbb_wholesale || 0),
    cbbRetail: Number(r.cbb_retail || 0),
    yourCost: Number(r.your_cost || 0),
    suggestedPrice: Number(r.suggested_price || 0),
    inStock: Boolean(r.in_stock !== false),
    imageUrl: r.image_url || undefined,
    blackBookValue: r.black_book_value != null ? Number(r.black_book_value) : undefined,
  };
}

export async function saveInventoryToSupabase(vehicles: Vehicle[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (!vehicles || vehicles.length === 0) return;
  const rows = vehicles.map(toRow);
  // upsert by id
  const { error } = await sb.from('vehicles').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error('Supabase upsert failed: ' + error.message);
}

export async function fetchInventoryFromSupabase(): Promise<Vehicle[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('vehicles').select('*').limit(1000);
  if (error) throw new Error('Supabase select failed: ' + error.message);
  return (data || []).map(fromRow);
}
