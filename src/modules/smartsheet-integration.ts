/**
 * SMARTSHEET INTEGRATION MODULE
 * Read and write deal data to SmartSheet for pipeline tracking
 */

import { Deal, ScoredVehicleRow, ApprovalSpec } from '../types/types';

const SMARTSHEET_ACCESS_TOKEN = process.env.SMARTSHEET_ACCESS_TOKEN || '';
const SMARTSHEET_SHEET_ID = process.env.SMARTSHEET_SHEET_ID || '';

interface SmartSheetRow {
  id?: number;
  cells: Array<{
    columnId: number;
    value: string | number | boolean;
  }>;
}

interface SmartSheetColumn {
  id: number;
  title: string;
  type: string;
}

/**
 * Get SmartSheet API client
 */
function getSmartSheetHeaders() {
  return {
    'Authorization': `Bearer ${SMARTSHEET_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Fetch all deals from SmartSheet
 */
export async function fetchDealsFromSmartSheet(): Promise<any[]> {
  if (!SMARTSHEET_ACCESS_TOKEN || !SMARTSHEET_SHEET_ID) {
    throw new Error('SmartSheet credentials not configured');
  }

  try {
    const response = await fetch(`https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_SHEET_ID}`, {
      headers: getSmartSheetHeaders()
    });

    if (!response.ok) {
      throw new Error(`SmartSheet API error: ${response.statusText}`);
    }

    const data = await response.json();
    const columns: SmartSheetColumn[] = data.columns || [];
    const rows: SmartSheetRow[] = data.rows || [];

    // Map column titles to IDs for easier access
    const columnMap: Record<string, number> = {};
    columns.forEach(col => {
      columnMap[col.title] = col.id;
    });

    // Convert rows to deal objects
    const deals = rows.map(row => {
      const deal: any = { smartsheetRowId: row.id };
      row.cells.forEach(cell => {
        const column = columns.find(c => c.id === cell.columnId);
        if (column) {
          deal[column.title] = cell.value;
        }
      });
      return deal;
    });

    return deals;
  } catch (error) {
    console.error('Error fetching from SmartSheet:', error);
    throw error;
  }
}

/**
 * Push a new deal to SmartSheet
 */
export async function pushDealToSmartSheet(deal: {
  customerName?: string;
  vehicle: string;
  lender: string;
  program: string;
  salePrice: number;
  payment: number;
  term: number;
  frontGross: number;
  backGross: number;
  totalGross: number;
  status: string;
  vin?: string;
}): Promise<number> {
  if (!SMARTSHEET_ACCESS_TOKEN || !SMARTSHEET_SHEET_ID) {
    throw new Error('SmartSheet credentials not configured');
  }

  try {
    // First, get column IDs
    const sheetResponse = await fetch(`https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_SHEET_ID}`, {
      headers: getSmartSheetHeaders()
    });

    if (!sheetResponse.ok) {
      throw new Error(`SmartSheet API error: ${sheetResponse.statusText}`);
    }

    const sheetData = await sheetResponse.json();
    const columns: SmartSheetColumn[] = sheetData.columns || [];

    // Map column titles to IDs
    const columnMap: Record<string, number> = {};
    columns.forEach(col => {
      columnMap[col.title] = col.id;
    });

    // Build row cells
    const cells = [];
    if (columnMap['Customer Name'] && deal.customerName) {
      cells.push({ columnId: columnMap['Customer Name'], value: deal.customerName });
    }
    if (columnMap['Vehicle']) {
      cells.push({ columnId: columnMap['Vehicle'], value: deal.vehicle });
    }
    if (columnMap['VIN'] && deal.vin) {
      cells.push({ columnId: columnMap['VIN'], value: deal.vin });
    }
    if (columnMap['Lender']) {
      cells.push({ columnId: columnMap['Lender'], value: deal.lender });
    }
    if (columnMap['Program']) {
      cells.push({ columnId: columnMap['Program'], value: deal.program });
    }
    if (columnMap['Sale Price']) {
      cells.push({ columnId: columnMap['Sale Price'], value: deal.salePrice });
    }
    if (columnMap['Payment']) {
      cells.push({ columnId: columnMap['Payment'], value: deal.payment });
    }
    if (columnMap['Term']) {
      cells.push({ columnId: columnMap['Term'], value: deal.term });
    }
    if (columnMap['Front Gross']) {
      cells.push({ columnId: columnMap['Front Gross'], value: deal.frontGross });
    }
    if (columnMap['Back Gross']) {
      cells.push({ columnId: columnMap['Back Gross'], value: deal.backGross });
    }
    if (columnMap['Total Gross']) {
      cells.push({ columnId: columnMap['Total Gross'], value: deal.totalGross });
    }
    if (columnMap['Status']) {
      cells.push({ columnId: columnMap['Status'], value: deal.status });
    }
    if (columnMap['Date']) {
      cells.push({ columnId: columnMap['Date'], value: new Date().toISOString().split('T')[0] });
    }

    // Add row to sheet
    const addRowResponse = await fetch(`https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_SHEET_ID}/rows`, {
      method: 'POST',
      headers: getSmartSheetHeaders(),
      body: JSON.stringify({
        toBottom: true,
        rows: [{ cells }]
      })
    });

    if (!addRowResponse.ok) {
      throw new Error(`SmartSheet API error: ${addRowResponse.statusText}`);
    }

    const result = await addRowResponse.json();
    return result.result?.[0]?.id || 0;
  } catch (error) {
    console.error('Error pushing to SmartSheet:', error);
    throw error;
  }
}

/**
 * Update deal status in SmartSheet
 */
export async function updateDealStatusInSmartSheet(rowId: number, status: string): Promise<void> {
  if (!SMARTSHEET_ACCESS_TOKEN || !SMARTSHEET_SHEET_ID) {
    throw new Error('SmartSheet credentials not configured');
  }

  try {
    // Get column ID for Status
    const sheetResponse = await fetch(`https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_SHEET_ID}`, {
      headers: getSmartSheetHeaders()
    });

    if (!sheetResponse.ok) {
      throw new Error(`SmartSheet API error: ${sheetResponse.statusText}`);
    }

    const sheetData = await sheetResponse.json();
    const columns: SmartSheetColumn[] = sheetData.columns || [];
    const statusColumn = columns.find(c => c.title === 'Status');

    if (!statusColumn) {
      throw new Error('Status column not found in SmartSheet');
    }

    // Update row
    const updateResponse = await fetch(`https://api.smartsheet.com/2.0/sheets/${SMARTSHEET_SHEET_ID}/rows`, {
      method: 'PUT',
      headers: getSmartSheetHeaders(),
      body: JSON.stringify({
        rows: [{
          id: rowId,
          cells: [{ columnId: statusColumn.id, value: status }]
        }]
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`SmartSheet API error: ${updateResponse.statusText}`);
    }
  } catch (error) {
    console.error('Error updating SmartSheet:', error);
    throw error;
  }
}
