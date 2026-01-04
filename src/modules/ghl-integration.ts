/**
 * MODULE 10: GOHIGHLEVEL INTEGRATION
 * Saves deals to GoHighLevel CRM system with OAuth refresh and retry logic
 */

import axios, { AxiosError } from 'axios';
import { Deal, GHLResponse } from '../types/types';
import { getValidToken } from './ghl-oauth';
import logger from '../utils/logger';

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (error.response?.status === 401) {
        throw error;
      }
      
      if (error.response?.status >= 500 || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: error.message,
          status: error.response?.status
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

export async function saveDealToGHL(
  deal: Deal,
  customerId: string,
  locationId: string
): Promise<GHLResponse> {
  try {
    const accessToken = await getValidToken(locationId);
    const noteContent = formatDealNote(deal);

    const { data } = await retryWithBackoff(async () => {
      return await axios.post(
        `https://rest.gohighlevel.com/v1/contacts/${encodeURIComponent(customerId)}/notes`,
        {
          body: noteContent,
          tags: ['deal', deal.lender, deal.tier],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Version: '2021-07-28',
          },
          timeout: 15000,
        }
      );
    });

    logger.info('Deal saved to GHL successfully', { customerId, noteId: data.id });

    return {
      success: true,
      noteId: data.id,
      dealLink: generateDealLink(deal, customerId),
    };
  } catch (error: any) {
    const axiosError = error as AxiosError;
    const errorMessage = axiosError.response?.data 
      ? JSON.stringify(axiosError.response.data)
      : error.message;
    
    logger.error('Failed to save deal to GHL', {
      customerId,
      error: errorMessage,
      status: axiosError.response?.status
    });

    return {
      success: false,
      error: `Failed to save to GHL: ${errorMessage}`,
    };
  }
}

export function generateDealLink(deal: Deal, customerId: string): string {
  return `https://your-domain.com/desk?contact_id=${customerId}&deal_id=${deal.id}&vehicle_id=${deal.vehicle.id}&lender=${deal.lender}&tier=${deal.tier}`;
}

function formatDealNote(deal: Deal): string {
  return `
VEHICLE DEAL
${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}
Stock: ${deal.vehicle.id} | VIN: ${deal.vehicle.vin}

DEAL STRUCTURE
Sale Price: $${deal.salePrice.toLocaleString()}
Down Payment: $${deal.downPayment.toLocaleString()}
Amount to Finance: $${deal.financeAmount.toLocaleString()}
Monthly Payment: $${deal.monthlyPayment}/month

LENDER
${deal.lender} ${deal.tier}

COMPLIANCE
DSR: ${deal.compliance.dsr.toFixed(2)}% ${deal.compliance.dsrPass ? '✓' : '✗'}
LTV: ${deal.compliance.ltv.toFixed(2)}% ${deal.compliance.ltvPass ? '✓' : '✗'}
Status: ${deal.compliance.overall ? 'COMPLIANT' : 'NON-COMPLIANT'}

GROSS PROFIT
Vehicle Gross: $${deal.grossProfit.vehicleGross.toLocaleString()}
Lender Reserve: $${deal.grossProfit.lenderReserve.toLocaleString()}
Rate Upsell: $${deal.grossProfit.rateUpsell.toLocaleString()}
Product Margin: $${deal.grossProfit.productMargin.toLocaleString()}
TOTAL: $${deal.grossProfit.total.toLocaleString()}
`;
}
