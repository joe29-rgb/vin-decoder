/**
 * MODULE 10: GOHIGHLEVEL INTEGRATION
 * Saves deals to GoHighLevel CRM system
 */

import axios from 'axios';
import { Deal, GHLResponse } from '../types/types';

export async function saveDealToGHL(
  deal: Deal,
  customerId: string,
  accessToken: string
): Promise<GHLResponse> {
  try {
    const noteContent = formatDealNote(deal);

    const { data } = await axios.post(
      `https://rest.gohighlevel.com/v1/contacts/${encodeURIComponent(customerId)}/notes`,
      {
        body: noteContent,
        tags: ['deal', deal.lender, deal.tier],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return {
      success: true,
      noteId: data.id,
      dealLink: generateDealLink(deal, customerId),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save to GHL: ${(error as Error).message}`,
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
