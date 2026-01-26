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
    black_book_value: v.blackBookValue,
    your_cost: v.yourCost,
    suggested_price: v.suggestedPrice,
    in_stock: v.inStock,
    image_url: v.imageUrl ?? null,
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
    blackBookValue: Number(r.black_book_value || 0),
    yourCost: Number(r.your_cost || 0),
    suggestedPrice: Number(r.suggested_price || 0),
    inStock: Boolean(r.in_stock !== false),
    imageUrl: r.image_url || undefined,
  };
}

export async function saveInventoryToSupabase(vehicles: Vehicle[], dealershipId?: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  
  // Add dealership_id to each vehicle if provided
  const rows = vehicles.map(v => {
    const row = toRow(v);
    if (dealershipId) {
      (row as any).dealership_id = dealershipId;
    }
    return row;
  });
  
  const { error } = await sb.from('vehicles').upsert(rows, { onConflict: 'vin' });
  if (error) throw new Error('Supabase upsert failed: ' + error.message);
}

export async function fetchInventoryFromSupabase(dealershipId?: string): Promise<Vehicle[]> {
  const sb = getSupabase();
  if (!sb) return [];
  
  let query = sb.from('vehicles').select('*').limit(1000);
  
  // Filter by dealership if provided
  if (dealershipId) {
    query = query.eq('dealership_id', dealershipId);
  }
  
  const { data, error } = await query;
  if (error) throw new Error('Supabase fetch failed: ' + error.message);
  return (data || []).map(fromRow);
}

/**
 * Scraper cache functions for 7-day persistent storage
 */
export async function saveScraperCacheToSupabase(cacheEntry: {
  url: string;
  vehicles: Vehicle[];
  timestamp: number;
  expiresAt: number;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  
  const { error } = await sb.from('scraper_cache').upsert({
    url: cacheEntry.url,
    vehicles: JSON.stringify(cacheEntry.vehicles),
    timestamp: new Date(cacheEntry.timestamp).toISOString(),
    expires_at: new Date(cacheEntry.expiresAt).toISOString()
  }, { onConflict: 'url' });
  
  if (error) throw new Error('Supabase cache save failed: ' + error.message);
}

export async function fetchScraperCacheFromSupabase(url: string): Promise<{
  url: string;
  vehicles: Vehicle[];
  timestamp: number;
  expiresAt: number;
} | null> {
  const sb = getSupabase();
  if (!sb) return null;
  
  const { data, error } = await sb
    .from('scraper_cache')
    .select('*')
    .eq('url', url)
    .single();
  
  if (error || !data) return null;
  
  return {
    url: data.url,
    vehicles: JSON.parse(data.vehicles),
    timestamp: new Date(data.timestamp).getTime(),
    expiresAt: new Date(data.expires_at).getTime()
  };
}
