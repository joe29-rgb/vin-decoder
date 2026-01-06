/**
 * GHL WEBHOOK HANDLER MODULE
 * Process real-time updates from GoHighLevel webhooks
 */

import crypto from 'crypto';
import { state } from '../api/state';

interface GHLWebhookPayload {
  type: string;
  location_id: string;
  contact?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    customFields?: Record<string, any>;
  };
  opportunity?: {
    id: string;
    name: string;
    status: string;
    monetaryValue: number;
    contact_id: string;
    customFields?: Record<string, any>;
  };
  note?: {
    id: string;
    body: string;
    contact_id: string;
  };
}

/**
 * Verify GHL webhook signature
 */
export function verifyGHLWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

/**
 * Process GHL webhook payload
 */
export async function processGHLWebhook(payload: GHLWebhookPayload): Promise<void> {
  try {
    switch (payload.type) {
      case 'contact.created':
      case 'contact.updated':
        await handleContactUpdate(payload);
        break;
      
      case 'opportunity.created':
      case 'opportunity.updated':
        await handleOpportunityUpdate(payload);
        break;
      
      case 'note.created':
        await handleNoteCreated(payload);
        break;
      
      default:
        console.log(`Unhandled webhook type: ${payload.type}`);
    }
  } catch (error) {
    console.error('Error processing GHL webhook:', error);
    throw error;
  }
}

/**
 * Handle contact created/updated events
 */
async function handleContactUpdate(payload: GHLWebhookPayload): Promise<void> {
  if (!payload.contact) return;

  const contact = payload.contact;
  
  // Extract trade-in information from custom fields
  const tradeInfo = {
    allowance: parseFloat(contact.customFields?.trade_allowance || '0'),
    acv: parseFloat(contact.customFields?.trade_acv || '0'),
    lienBalance: parseFloat(contact.customFields?.trade_lien || '0'),
    make: contact.customFields?.trade_make || '',
    model: contact.customFields?.trade_model || '',
    year: parseInt(contact.customFields?.trade_year || '0'),
    vin: contact.customFields?.trade_vin || ''
  };

  // Extract approval information from custom fields
  const approvalInfo = {
    lender: contact.customFields?.approval_lender || '',
    program: contact.customFields?.approval_program || '',
    apr: parseFloat(contact.customFields?.approval_apr || '0'),
    termMonths: parseInt(contact.customFields?.approval_term || '0'),
    paymentMax: parseFloat(contact.customFields?.approval_payment_max || '0'),
    paymentMin: parseFloat(contact.customFields?.approval_payment_min || '0'),
    status: contact.customFields?.approval_status || ''
  };

  // Update state if we have both approval and trade info
  if (approvalInfo.lender && approvalInfo.paymentMax > 0) {
    // Check if this matches our last approval
    if (state.lastApproval && state.lastApproval.approval.bank === approvalInfo.lender) {
      // Update trade info
      state.lastApproval.trade = {
        allowance: tradeInfo.allowance,
        acv: tradeInfo.acv,
        lienBalance: tradeInfo.lienBalance
      };
      
      console.log(`Updated trade info from GHL for contact ${contact.id}`);
      
      // Auto-trigger scoring if we have inventory
      if (state.inventory.length > 0) {
        console.log('Auto-triggering scoring with updated trade info');
        // Note: Actual scoring would be triggered by the frontend or a background job
      }
    }
  }

  console.log(`Processed contact update: ${contact.name} (${contact.id})`);
}

/**
 * Handle opportunity created/updated events
 */
async function handleOpportunityUpdate(payload: GHLWebhookPayload): Promise<void> {
  if (!payload.opportunity) return;

  const opportunity = payload.opportunity;
  
  // Extract deal information from opportunity
  const dealInfo = {
    contactId: opportunity.contact_id,
    opportunityId: opportunity.id,
    vehicleInfo: opportunity.customFields?.vehicle_info || '',
    salePrice: parseFloat(opportunity.customFields?.sale_price || '0'),
    payment: parseFloat(opportunity.customFields?.monthly_payment || '0'),
    status: opportunity.status,
    monetaryValue: opportunity.monetaryValue
  };

  console.log(`Processed opportunity update: ${opportunity.name} - ${opportunity.status}`);
  
  // Update deal status in SmartSheet if configured
  if (dealInfo.status === 'won') {
    console.log(`Deal won: ${opportunity.name} - $${opportunity.monetaryValue}`);
    // Note: SmartSheet sync would happen here
  }
}

/**
 * Handle note created events
 */
async function handleNoteCreated(payload: GHLWebhookPayload): Promise<void> {
  if (!payload.note) return;

  const note = payload.note;
  
  // Check if note contains deal information
  if (note.body.includes('Deal Summary') || note.body.includes('Scored Deal')) {
    console.log(`Deal note created for contact ${note.contact_id}`);
    // Note: Could extract deal details from note body and update tracking
  }
}

/**
 * Extract custom field value from GHL contact
 */
export function extractCustomField(
  contact: any,
  fieldKey: string,
  defaultValue: any = null
): any {
  if (!contact || !contact.customFields) return defaultValue;
  
  // Try direct key access
  if (contact.customFields[fieldKey] !== undefined) {
    return contact.customFields[fieldKey];
  }
  
  // Try case-insensitive search
  const lowerKey = fieldKey.toLowerCase();
  for (const key in contact.customFields) {
    if (key.toLowerCase() === lowerKey) {
      return contact.customFields[key];
    }
  }
  
  return defaultValue;
}

/**
 * Parse trade information from GHL contact
 */
export function parseTradeInfoFromGHL(contact: any): {
  allowance: number;
  acv: number;
  lienBalance: number;
} {
  return {
    allowance: parseFloat(extractCustomField(contact, 'trade_allowance', '0')),
    acv: parseFloat(extractCustomField(contact, 'trade_acv', '0')),
    lienBalance: parseFloat(extractCustomField(contact, 'trade_lien', '0'))
  };
}

/**
 * Parse approval information from GHL contact
 */
export function parseApprovalInfoFromGHL(contact: any): any {
  return {
    bank: extractCustomField(contact, 'approval_lender', ''),
    program: extractCustomField(contact, 'approval_program', ''),
    apr: parseFloat(extractCustomField(contact, 'approval_apr', '0')),
    termMonths: parseInt(extractCustomField(contact, 'approval_term', '0')),
    paymentMax: parseFloat(extractCustomField(contact, 'approval_payment_max', '0')),
    paymentMin: parseFloat(extractCustomField(contact, 'approval_payment_min', '0')),
    downPayment: parseFloat(extractCustomField(contact, 'down_payment', '0')),
    province: extractCustomField(contact, 'province', 'AB'),
    customerName: contact.name || ''
  };
}
