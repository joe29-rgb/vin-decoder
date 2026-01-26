import { getSupabase } from './supabase';
import { ApprovalSpec, TradeInfo } from '../types/types';

export interface ApprovalRecord {
  id: string;
  dealership_id: string;
  contact_id: string;
  location_id: string;
  customer_name?: string;
  province?: string;
  is_native_status?: boolean;
  bank: string;
  program?: string;
  apr?: number;
  term_months?: number;
  payment_min?: number;
  payment_max?: number;
  down_payment?: number;
  trade_allowance?: number;
  trade_acv?: number;
  trade_lien?: number;
  trade_year?: number;
  trade_make?: string;
  trade_model?: string;
  trade_vin?: string;
  front_cap_factor?: number;
  status?: string;
  created_at: string;
  updated_at?: string;
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
        bank: approval.bank,
        program: approval.program,
        apr: approval.apr,
        term_months: approval.termMonths,
        payment_min: approval.paymentMin,
        payment_max: approval.paymentMax,
        down_payment: approval.downPayment,
        trade_allowance: trade.allowance,
        trade_acv: trade.acv,
        trade_lien: trade.lienBalance,
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
