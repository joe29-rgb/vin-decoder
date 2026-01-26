import { getSupabase } from './supabase';

export interface DealRecord {
  id: string;
  dealership_id: string;
  approval_id?: string;
  vehicle_id?: string;
  sale_price?: number;
  monthly_payment?: number;
  front_gross?: number;
  back_gross?: number;
  product_margin?: number;
  total_gross?: number;
  lender?: string;
  tier?: string;
  term?: number;
  apr?: number;
  ltv?: number;
  dsr?: number;
  status?: string;
  pushed_to_ghl?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Save deal to Supabase
 */
export async function saveDealToSupabase(
  dealershipId: string,
  dealData: Partial<DealRecord>
): Promise<DealRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const record = {
      dealership_id: dealershipId,
      ...dealData,
    };

    const { data, error } = await sb
      .from('deals')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Failed to save deal:', error);
      return null;
    }

    return data as DealRecord;
  } catch (error) {
    console.error('Error saving deal:', error);
    return null;
  }
}

/**
 * Update existing deal in Supabase
 */
export async function updateDealInSupabase(
  dealId: string,
  dealershipId: string,
  updates: Partial<DealRecord>
): Promise<DealRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('deals')
      .update(updates)
      .eq('id', dealId)
      .eq('dealership_id', dealershipId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update deal:', error);
      return null;
    }

    return data as DealRecord;
  } catch (error) {
    console.error('Error updating deal:', error);
    return null;
  }
}

/**
 * Get all deals for a dealership
 */
export async function getDealsFromSupabase(
  dealershipId: string,
  limit: number = 100,
  status?: string
): Promise<DealRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    let query = sb
      .from('deals')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch deals:', error);
      return [];
    }

    return (data || []) as DealRecord[];
  } catch (error) {
    console.error('Error fetching deals:', error);
    return [];
  }
}

/**
 * Get single deal by ID
 */
export async function getDealByIdFromSupabase(
  dealId: string,
  dealershipId: string
): Promise<DealRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('dealership_id', dealershipId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as DealRecord;
  } catch (error) {
    console.error('Error fetching deal:', error);
    return null;
  }
}

/**
 * Delete deal from Supabase
 */
export async function deleteDealFromSupabase(
  dealId: string,
  dealershipId: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { error } = await sb
      .from('deals')
      .delete()
      .eq('id', dealId)
      .eq('dealership_id', dealershipId);

    if (error) {
      console.error('Failed to delete deal:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting deal:', error);
    return false;
  }
}

/**
 * Get deal statistics for a dealership
 */
export async function getDealStatsFromSupabase(
  dealershipId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalDeals: number;
  totalGross: number;
  avgFrontGross: number;
  avgBackGross: number;
  avgDealValue: number;
}> {
  const sb = getSupabase();
  if (!sb) {
    return {
      totalDeals: 0,
      totalGross: 0,
      avgFrontGross: 0,
      avgBackGross: 0,
      avgDealValue: 0,
    };
  }

  try {
    let query = sb
      .from('deals')
      .select('front_gross, back_gross, total_gross, total_deal_value')
      .eq('dealership_id', dealershipId)
      .eq('status', 'completed');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        totalDeals: 0,
        totalGross: 0,
        avgFrontGross: 0,
        avgBackGross: 0,
        avgDealValue: 0,
      };
    }

    const totalDeals = data.length;
    const totalGross = data.reduce((sum, d) => sum + (d.total_gross || 0), 0);
    const totalFrontGross = data.reduce((sum, d) => sum + (d.front_gross || 0), 0);
    const totalBackGross = data.reduce((sum, d) => sum + (d.back_gross || 0), 0);
    const totalDealValue = data.reduce((sum, d) => sum + (d.total_deal_value || 0), 0);

    return {
      totalDeals,
      totalGross,
      avgFrontGross: totalFrontGross / totalDeals,
      avgBackGross: totalBackGross / totalDeals,
      avgDealValue: totalDealValue / totalDeals,
    };
  } catch (error) {
    console.error('Error fetching deal stats:', error);
    return {
      totalDeals: 0,
      totalGross: 0,
      avgFrontGross: 0,
      avgBackGross: 0,
      avgDealValue: 0,
    };
  }
}
