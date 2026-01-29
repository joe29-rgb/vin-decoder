import { getSupabase } from './supabase';

export interface Dealership {
  id: string;
  ghl_location_id: string;
  ghl_company_id?: string;
  name: string;
  website_url?: string;
  logo_url?: string;
  location?: string;
  postal_code?: string;
  province: string;
  used_inventory_path: string;
  new_inventory_path: string;
  competitor_radius_km: number;
  doc_fee: number;
  cbb_api_key?: string;
  cbb_api_url?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  settings?: any;
  onboarding_complete: boolean;
  onboarding_step: number;
  is_active: boolean;
  subscription_status: string;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create a dealership by GHL location ID
 */
export async function getOrCreateDealership(ghlLocationId: string, companyId?: string): Promise<Dealership | null> {
  const sb = getSupabase();
  if (!sb) {
    console.error('Supabase not configured');
    return null;
  }

  try {
    // Try to find existing dealership
    const { data: existing, error: findError } = await sb
      .from('dealerships')
      .select('*')
      .eq('ghl_location_id', ghlLocationId)
      .single();

    if (existing && !findError) {
      return existing as Dealership;
    }

    // Create new dealership
    const newDealership = {
      ghl_location_id: ghlLocationId,
      ghl_company_id: companyId,
      name: 'New Dealership',
      province: 'AB',
      used_inventory_path: '/search/used/',
      new_inventory_path: '/search/new/',
      competitor_radius_km: 100,
      doc_fee: 799.00,
      cbb_api_url: 'https://api.canadianblackbook.com/v1',
      onboarding_complete: false,
      onboarding_step: 0,
      is_active: true,
      subscription_status: 'trial',
    };

    const { data: created, error: createError } = await sb
      .from('dealerships')
      .insert(newDealership)
      .select()
      .single();

    if (createError) {
      console.error('Failed to create dealership:', createError);
      return null;
    }

    return created as Dealership;
  } catch (error) {
    console.error('Error in getOrCreateDealership:', error);
    return null;
  }
}

/**
 * Get dealership by ID
 */
export async function getDealershipById(dealershipId: string): Promise<Dealership | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('dealerships')
      .select('*')
      .eq('id', dealershipId)
      .single();

    if (error) {
      console.error('Failed to get dealership:', error);
      return null;
    }

    return data as Dealership;
  } catch (error) {
    console.error('Error in getDealershipById:', error);
    return null;
  }
}

/**
 * Update dealership configuration
 */
export async function updateDealershipConfig(dealershipId: string, updates: Partial<Dealership>): Promise<Dealership | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('dealerships')
      .update(updates)
      .eq('id', dealershipId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update dealership:', error);
      return null;
    }

    return data as Dealership;
  } catch (error) {
    console.error('Error in updateDealershipConfig:', error);
    return null;
  }
}

/**
 * Store OAuth tokens for a dealership
 */
export async function storeDealershipTokens(
  dealershipId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error } = await sb
      .from('dealerships')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
      })
      .eq('id', dealershipId);

    if (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in storeDealershipTokens:', error);
    return false;
  }
}

/**
 * Get dealership tokens
 */
export async function getDealershipTokens(dealershipId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
} | null> {
  const dealership = await getDealershipById(dealershipId);
  if (!dealership || !dealership.access_token) {
    return null;
  }

  return {
    accessToken: dealership.access_token,
    refreshToken: dealership.refresh_token || '',
    expiresAt: dealership.token_expires_at || '',
  };
}

/**
 * Extract dealership ID from request
 * In production, this would come from JWT or session
 * For now, we'll use a header or query param
 */
export function getDealershipIdFromRequest(req: any): string | null {
  // Priority order:
  // 1. JWT claim (when implemented)
  // 2. Header
  // 3. Query param
  // 4. Session (when implemented)
  
  return req.headers['x-dealership-id'] || req.query.dealershipId || null;
}

/**
 * Middleware to require dealership context
 */
export function requireDealership(req: any, res: any, next: any) {
  const dealershipId = getDealershipIdFromRequest(req);
  
  if (!dealershipId) {
    return res.status(401).json({
      success: false,
      error: 'Dealership context required',
      message: 'Please authenticate or provide dealership ID'
    });
  }
  
  req.dealershipId = dealershipId;
  next();
}

/**
 * Initialize sample dealerships for development/testing
 */
export async function initializeSampleDealerships(): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    console.log('[DEALERSHIPS] Supabase not configured, skipping sample dealerships');
    return;
  }

  const sampleDealerships = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      ghl_location_id: 'loc-001',
      name: 'Devon Chrysler',
      website_url: 'https://www.devonchrysler.com',
      location: 'Devon',
      postal_code: 'T9G',
      province: 'AB',
      used_inventory_path: '/search/used-devon-ab/?cy=t9g_1b2&tp=used',
      new_inventory_path: '/search/new-chrysler-dodge-jeep-ram-devon-ab/?cy=t9g_1b2&tp=new',
      competitor_radius_km: 100,
      doc_fee: 799.00,
      cbb_api_url: 'https://api.canadianblackbook.com/v1',
      onboarding_complete: true,
      onboarding_step: 5,
      is_active: true,
      subscription_status: 'active',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      ghl_location_id: 'loc-002',
      name: 'Edmonton Motors',
      website_url: 'https://www.edmontonmotors.com',
      location: 'Edmonton',
      postal_code: 'T5J',
      province: 'AB',
      used_inventory_path: '/inventory/used/',
      new_inventory_path: '/inventory/new/',
      competitor_radius_km: 150,
      doc_fee: 899.00,
      cbb_api_url: 'https://api.canadianblackbook.com/v1',
      onboarding_complete: true,
      onboarding_step: 5,
      is_active: true,
      subscription_status: 'active',
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      ghl_location_id: 'loc-003',
      name: 'Red Deer Auto Sales',
      website_url: 'https://www.reddeerauto.com',
      location: 'Red Deer',
      postal_code: 'T4N',
      province: 'AB',
      used_inventory_path: '/search/used/',
      new_inventory_path: '/search/new/',
      competitor_radius_km: 100,
      doc_fee: 799.00,
      cbb_api_url: 'https://api.canadianblackbook.com/v1',
      onboarding_complete: false,
      onboarding_step: 2,
      is_active: true,
      subscription_status: 'trial',
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      ghl_location_id: 'loc-004',
      name: 'Lethbridge Car Depot',
      website_url: 'https://www.lethbridgecars.com',
      location: 'Lethbridge',
      postal_code: 'T1J',
      province: 'AB',
      used_inventory_path: '/vehicles/used/',
      new_inventory_path: '/vehicles/new/',
      competitor_radius_km: 100,
      doc_fee: 749.00,
      cbb_api_url: 'https://api.canadianblackbook.com/v1',
      onboarding_complete: true,
      onboarding_step: 5,
      is_active: true,
      subscription_status: 'active',
    },
  ];

  try {
    for (const dealership of sampleDealerships) {
      const { error } = await sb
        .from('dealerships')
        .upsert(dealership, { onConflict: 'id' });

      if (error) {
        console.error(`[DEALERSHIPS] ❌ Failed to upsert ${dealership.name}:`, {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          dealershipId: dealership.id
        });
      } else {
        console.log(`[DEALERSHIPS] ✅ Dealership added/updated: ${dealership.id} - ${dealership.name}`);
      }
    }
    
    console.log(`[DEALERSHIPS] Sample dealerships initialized (${sampleDealerships.length} total)`);
  } catch (error) {
    console.error('[DEALERSHIPS] Error initializing sample dealerships:', error);
  }
}
