/**
 * SCRAPER CACHE MODULE
 * 7-day persistent cache for scraped inventory data
 */

import { Vehicle } from '../types/types';
import { saveScraperCacheToSupabase, fetchScraperCacheFromSupabase } from './supabase';

interface CacheEntry {
  url: string;
  vehicles: Vehicle[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const inMemoryCache: Map<string, CacheEntry> = new Map();

/**
 * Get cached vehicles if not expired
 */
export async function getCachedVehicles(url: string): Promise<Vehicle[] | null> {
  // Check in-memory cache first
  const cached = inMemoryCache.get(url);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[CACHE] Hit (in-memory): ${url}`);
    return cached.vehicles;
  }

  // Check Supabase cache
  try {
    const dbCache = await fetchScraperCacheFromSupabase(url);
    if (dbCache && Date.now() < dbCache.expiresAt) {
      console.log(`[CACHE] Hit (database): ${url}`);
      // Populate in-memory cache
      inMemoryCache.set(url, dbCache);
      return dbCache.vehicles;
    }
  } catch (error) {
    console.error('[CACHE] Error fetching from database:', error);
  }

  console.log(`[CACHE] Miss: ${url}`);
  return null;
}

/**
 * Save vehicles to cache
 */
export async function setCachedVehicles(url: string, vehicles: Vehicle[]): Promise<void> {
  const entry: CacheEntry = {
    url,
    vehicles,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_DURATION_MS
  };

  // Save to in-memory cache
  inMemoryCache.set(url, entry);
  console.log(`[CACHE] Saved (in-memory): ${url} - ${vehicles.length} vehicles`);

  // Save to Supabase
  try {
    await saveScraperCacheToSupabase(entry);
    console.log(`[CACHE] Saved (database): ${url}`);
  } catch (error) {
    console.error('[CACHE] Error saving to database:', error);
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  let cleared = 0;
  
  for (const [url, entry] of inMemoryCache.entries()) {
    if (now >= entry.expiresAt) {
      inMemoryCache.delete(url);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`[CACHE] Cleared ${cleared} expired entries`);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  totalVehicles: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  let totalVehicles = 0;
  let oldestEntry: number | null = null;
  let newestEntry: number | null = null;

  for (const entry of inMemoryCache.values()) {
    totalVehicles += entry.vehicles.length;
    
    if (oldestEntry === null || entry.timestamp < oldestEntry) {
      oldestEntry = entry.timestamp;
    }
    
    if (newestEntry === null || entry.timestamp > newestEntry) {
      newestEntry = entry.timestamp;
    }
  }

  return {
    totalEntries: inMemoryCache.size,
    totalVehicles,
    oldestEntry,
    newestEntry
  };
}
