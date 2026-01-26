import { getSupabase } from './supabase';
import { ApprovalSpec, TradeInfo } from '../types/types';

export interface ApprovalRecord {
  id: string;
  dealership_id: string;
  contact_id: string;
  location_id: string;
  approval: ApprovalSpec;
  trade: TradeInfo;
  created_at: string;
}

/**
 * Save approval to Supabase
 */
export async function saveApprovalToSupabase(
  dealershipId: string,
  contactId: string,
  locationId: string,
  approval: ApprovalSpec,
  trade: TradeInfo
): Promise<ApprovalRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('approvals')
      .insert({
        dealership_id: dealershipId,
        contact_id: contactId,
        location_id: locationId,
        approval: approval,
        trade: trade,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save approval:', error);
      return null;
    }

    return data as ApprovalRecord;
  } catch (error) {
    console.error('Error saving approval:', error);
    return null;
  }
}

/**
 * Get last approval for a dealership
 */
export async function getLastApprovalFromSupabase(
  dealershipId: string
): Promise<ApprovalRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('approvals')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data as ApprovalRecord;
  } catch (error) {
    console.error('Error fetching last approval:', error);
    return null;
  }
}

/**
 * Get all approvals for a dealership
 */
export async function getApprovalsFromSupabase(
  dealershipId: string,
  limit: number = 100
): Promise<ApprovalRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('approvals')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch approvals:', error);
      return [];
    }

    return (data || []) as ApprovalRecord[];
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return [];
  }
}
