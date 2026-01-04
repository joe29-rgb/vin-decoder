/**
 * GHL Webhook Verification
 * Validates incoming webhooks from GoHighLevel
 */

import crypto from 'crypto';
import logger from '../utils/logger';

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
    if (!isValid) {
      logger.warn('Webhook signature verification failed', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: signature.substring(0, 10) + '...'
      });
    }
    
    return isValid;
  } catch (error: any) {
    logger.error('Webhook signature verification error', { error: error.message });
    return false;
  }
}

export interface WebhookEvent {
  type: string;
  locationId: string;
  contactId?: string;
  opportunityId?: string;
  timestamp: number;
  data: any;
}

export function parseWebhookEvent(body: any): WebhookEvent | null {
  try {
    if (!body || typeof body !== 'object') {
      return null;
    }
    
    return {
      type: body.type || body.event_type || 'unknown',
      locationId: body.locationId || body.location_id || '',
      contactId: body.contactId || body.contact_id,
      opportunityId: body.opportunityId || body.opportunity_id,
      timestamp: body.timestamp || Date.now(),
      data: body.data || body,
    };
  } catch (error: any) {
    logger.error('Failed to parse webhook event', { error: error.message });
    return null;
  }
}

export async function handleContactUpdate(event: WebhookEvent): Promise<void> {
  logger.info('Processing contact update webhook', {
    contactId: event.contactId,
    locationId: event.locationId
  });
  
  // Process contact updates here
  // This can trigger approval ingestion, deal calculations, etc.
}

export async function handleOpportunityUpdate(event: WebhookEvent): Promise<void> {
  logger.info('Processing opportunity update webhook', {
    opportunityId: event.opportunityId,
    locationId: event.locationId
  });
  
  // Process opportunity updates here
}

export async function processWebhook(event: WebhookEvent): Promise<{ success: boolean; message?: string }> {
  try {
    switch (event.type) {
      case 'contact.update':
      case 'ContactUpdate':
        await handleContactUpdate(event);
        break;
        
      case 'opportunity.update':
      case 'OpportunityUpdate':
        await handleOpportunityUpdate(event);
        break;
        
      default:
        logger.info('Unhandled webhook type', { type: event.type });
    }
    
    return { success: true };
  } catch (error: any) {
    logger.error('Webhook processing failed', {
      type: event.type,
      error: error.message
    });
    return { success: false, message: error.message };
  }
}
