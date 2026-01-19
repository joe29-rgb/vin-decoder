/**
 * EXCEL EXPORT MODULE
 * Export inventory, deals, and reports to Excel format
 */

import ExcelJS from 'exceljs';
import { Vehicle, ScoredVehicleRow } from '../types/types';

/**
 * Export inventory to Excel
 */
export async function exportInventoryToExcel(inventory: Vehicle[]): Promise<any> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventory');

  // Define columns
  worksheet.columns = [
    { header: 'Stock #', key: 'id', width: 12 },
    { header: 'VIN', key: 'vin', width: 20 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Make', key: 'make', width: 15 },
    { header: 'Model', key: 'model', width: 20 },
    { header: 'Trim', key: 'trim', width: 15 },
    { header: 'Mileage', key: 'mileage', width: 12 },
    { header: 'Engine', key: 'engine', width: 15 },
    { header: 'Transmission', key: 'transmission', width: 15 },
    { header: 'Your Cost', key: 'yourCost', width: 12 },
    { header: 'Suggested Price', key: 'suggestedPrice', width: 15 },
    { header: 'Black Book', key: 'blackBookValue', width: 15 },
    { header: 'In Stock', key: 'inStock', width: 10 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3FB950' }
  };

  // Add data rows
  inventory.forEach(vehicle => {
    worksheet.addRow({
      id: vehicle.id,
      vin: vehicle.vin,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || '',
      mileage: vehicle.mileage,
      engine: vehicle.engine,
      transmission: vehicle.transmission,
      yourCost: vehicle.yourCost,
      suggestedPrice: vehicle.suggestedPrice,
      blackBookValue: vehicle.blackBookValue,
      inStock: vehicle.inStock ? 'Yes' : 'No'
    });
  });

  // Format currency columns
  ['yourCost', 'suggestedPrice', 'blackBookValue'].forEach(key => {
    const col = worksheet.getColumn(key);
    col.numFmt = '$#,##0.00';
  });

  // Format number columns
  worksheet.getColumn('mileage').numFmt = '#,##0';

  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Export scored deals to Excel
 */
export async function exportDealsToExcel(deals: ScoredVehicleRow[], approvalInfo?: any): Promise<any> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scored Deals');

  // Add approval info header if provided
  if (approvalInfo) {
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `Approval: ${approvalInfo.bank} ${approvalInfo.program} | APR: ${approvalInfo.apr}% | Term: ${approvalInfo.termMonths}mo | Payment Range: $${approvalInfo.paymentMin}-$${approvalInfo.paymentMax}`;
    worksheet.getCell('A1').font = { bold: true, size: 12 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.addRow([]);
  }

  // Define columns
  const headerRow = approvalInfo ? 3 : 1;
  worksheet.getRow(headerRow).values = [
    'Rank',
    'Vehicle',
    'VIN',
    'Sale Price',
    'Monthly Payment',
    'Front Gross',
    'Back Gross',
    'Total Gross',
    'Flags'
  ];

  // Style header row
  worksheet.getRow(headerRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(headerRow).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF58A6FF' }
  };

  // Set column widths
  worksheet.columns = [
    { width: 8 },
    { width: 30 },
    { width: 20 },
    { width: 12 },
    { width: 15 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 30 }
  ];

  // Add data rows
  deals.forEach((deal, index) => {
    const row = worksheet.addRow([
      index + 1,
      deal.title,
      deal.vin,
      deal.salePrice,
      deal.monthlyPayment,
      deal.frontGross,
      deal.backGross,
      deal.totalGross,
      deal.flags.join(', ')
    ]);

    // Highlight top 3 deals
    if (index < 3) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index === 0 ? 'FFFFD700' : index === 1 ? 'FFC0C0C0' : 'FFCD7F32' }
      };
    }
  });

  // Format currency columns
  worksheet.getColumn(4).numFmt = '$#,##0';
  worksheet.getColumn(5).numFmt = '$#,##0';
  worksheet.getColumn(6).numFmt = '$#,##0';
  worksheet.getColumn(7).numFmt = '$#,##0';
  worksheet.getColumn(8).numFmt = '$#,##0';

  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= headerRow) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });

  // Add summary at bottom
  const summaryRow = worksheet.addRow([]);
  worksheet.addRow(['', 'SUMMARY', '', '', '', '', '', '', '']);
  worksheet.addRow(['', 'Total Vehicles:', deals.length, '', '', '', '', '', '']);
  worksheet.addRow(['', 'Avg Payment:', '', '', `=AVERAGE(E${headerRow + 1}:E${headerRow + deals.length})`, '', '', '', '']);
  worksheet.addRow(['', 'Total Gross:', '', '', '', '', '', `=SUM(H${headerRow + 1}:H${headerRow + deals.length})`, '']);

  return await workbook.xlsx.writeBuffer();
}

/**
 * Export analytics report to Excel
 */
export async function exportAnalyticsToExcel(data: {
  dealMetrics?: any;
  lenderPerformance?: any[];
  revenue?: any[];
}): Promise<any> {
  const workbook = new ExcelJS.Workbook();

  // Deal Metrics Sheet
  if (data.dealMetrics) {
    const metricsSheet = workbook.addWorksheet('Deal Metrics');
    metricsSheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    metricsSheet.getRow(1).font = { bold: true };
    metricsSheet.addRow({ metric: 'Total Deals', value: data.dealMetrics.totalDeals });
    metricsSheet.addRow({ metric: 'Total Revenue', value: data.dealMetrics.totalRevenue });
    metricsSheet.addRow({ metric: 'Avg Deal Size', value: data.dealMetrics.avgDealSize });
    metricsSheet.addRow({ metric: 'Approval Rate', value: `${data.dealMetrics.approvalRate}%` });

    metricsSheet.getColumn('value').numFmt = '$#,##0.00';
  }

  // Lender Performance Sheet
  if (data.lenderPerformance && data.lenderPerformance.length > 0) {
    const lenderSheet = workbook.addWorksheet('Lender Performance');
    lenderSheet.columns = [
      { header: 'Lender', key: 'lender', width: 20 },
      { header: 'Total Deals', key: 'deals', width: 15 },
      { header: 'Total Volume', key: 'volume', width: 15 },
      { header: 'Avg APR', key: 'avgAPR', width: 12 },
      { header: 'Approval Rate', key: 'approvalRate', width: 15 }
    ];

    lenderSheet.getRow(1).font = { bold: true };
    data.lenderPerformance.forEach(lender => {
      lenderSheet.addRow(lender);
    });

    lenderSheet.getColumn('volume').numFmt = '$#,##0.00';
    lenderSheet.getColumn('avgAPR').numFmt = '0.00%';
    lenderSheet.getColumn('approvalRate').numFmt = '0.00%';
  }

  // Revenue Sheet
  if (data.revenue && data.revenue.length > 0) {
    const revenueSheet = workbook.addWorksheet('Revenue by Month');
    revenueSheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 15 },
      { header: 'Deals', key: 'deals', width: 12 },
      { header: 'Avg Deal', key: 'avgDeal', width: 15 }
    ];

    revenueSheet.getRow(1).font = { bold: true };
    data.revenue.forEach(month => {
      revenueSheet.addRow(month);
    });

    revenueSheet.getColumn('revenue').numFmt = '$#,##0.00';
    revenueSheet.getColumn('avgDeal').numFmt = '$#,##0.00';
  }

  return await workbook.xlsx.writeBuffer();
}
